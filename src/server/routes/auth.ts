import { Hono } from "hono";
import { DEFAULT_PLAN_ID } from "@/lib/plans";
import { studioSettings } from "@/lib/mock";
import type { Role } from "@/lib/types";
import { endSessionCookie, requireUser, startSession, type AppEnv } from "../auth";
import { hashPassword, newId, verifyPassword } from "../crypto";
import { asStudio, asSystem } from "../db";
import { getPendingStudioPayment, listAlbums, listMembers, STUDIO_COLUMNS, toStudio, type StudioRow } from "../data";
import { EMAIL_RE, emailTaken, slugify, str, studioSlugError } from "../rules";
import { deleteObjects, isImageObject, isValidKey, objectSize, presignUpload, publicUrl } from "../storage";

export const authRoutes = new Hono<AppEnv>();

authRoutes.post("/auth/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = str(body.email, 200);
  const password = String(body.password ?? "");
  const remember = body.remember !== false;

  return asSystem(async (tx) => {
    const [user] = await tx<Array<{ id: string; passwordHash: string; platformAdmin: boolean }>>`
      select id, password_hash, platform_admin from users where lower(email) = lower(${email})`;
    if (!(await verifyPassword(password, user?.passwordHash))) return c.json({ error: "Email hoặc mật khẩu không đúng." }, 401);

    // Platform admins land in the console; everyone else in their first active studio.
    const studios = await tx<Array<{ id: string; name: string; status: string }>>`
      select s.id, s.name, s.status from memberships m join studios s on s.id = m.studio_id
      where m.user_id = ${user.id} order by m.created_at, s.created_at`;
    const active = studios.find((studio) => studio.status === "active");
    if (!active && !user.platformAdmin) {
      if (studios.length) return c.json({ error: `${studios[0].name} đang bị tạm khóa. Vui lòng liên hệ PICORA.` }, 403);
      return c.json({ error: "Tài khoản này chưa thuộc studio nào." }, 403);
    }
    const studioId = user.platformAdmin ? null : active?.id || null;
    await startSession(c, tx, user.id, studioId, remember);
    return c.json({ studioId });
  });
});

authRoutes.post("/auth/logout", async (c) => {
  const auth = c.get("auth");
  if (auth) await asSystem((tx) => tx`delete from sessions where token_hash = ${auth.tokenHash}`);
  endSessionCookie(c);
  return c.json({ ok: true });
});

authRoutes.post("/auth/signup", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const name = str(body.name, 120);
  const email = str(body.email, 200);
  const password = String(body.password ?? "");
  const studioName = str(body.studioName, 120);
  const slug = slugify(body.studioSlug || studioName);

  return asSystem(async (tx) => {
    const errors: Record<string, string> = {};
    if (!name) errors.ownerName = "Vui lòng nhập họ và tên.";
    if (!EMAIL_RE.test(email)) errors.email = "Vui lòng nhập email hợp lệ.";
    else if (await emailTaken(tx, email)) errors.email = "Email này đã được đăng ký.";
    if (password.length < 6) errors.password = "Mật khẩu cần ít nhất 6 ký tự.";
    if (!studioName) errors.studioName = "Vui lòng nhập tên studio.";
    const slugError = await studioSlugError(tx, slug);
    if (slugError) errors.studioSlug = slugError;
    if (Object.keys(errors).length) return c.json({ errors }, 422);

    const userId = newId("usr");
    const studioId = newId("std");
    await tx`insert into users (id, name, email, password_hash) values (${userId}, ${name}, ${email}, ${await hashPassword(password)})`;
    await tx`insert into studios (id, slug, name, plan_id, settings) values (${studioId}, ${slug}, ${studioName}, ${DEFAULT_PLAN_ID}, ${tx.json(studioSettings())})`;
    await tx`insert into memberships (user_id, studio_id, role) values (${userId}, ${studioId}, 'owner')`;
    await startSession(c, tx, userId, studioId, true);
    return c.json({ studioId, studioName });
  });
});

authRoutes.post("/session/studio", requireUser, async (c) => {
  const auth = c.get("auth")!;
  const { studioId } = await c.req.json().catch(() => ({}));
  return asSystem(async (tx) => {
    // A platform admin may drop back to the console, which has no studio context.
    if (!studioId && auth.user.platformAdmin) {
      await tx`update sessions set studio_id = null where token_hash = ${auth.tokenHash}`;
      return c.json({ studioId: null });
    }
    const [target] = await tx<Array<{ name: string; status: string }>>`
      select s.name, s.status from memberships m join studios s on s.id = m.studio_id
      where m.user_id = ${auth.user.id} and m.studio_id = ${String(studioId || "")}`;
    if (!target) return c.json({ error: "Bạn không thuộc studio này." }, 403);
    if (target.status !== "active") return c.json({ error: `${target.name} đang bị tạm khóa` }, 403);
    await tx`update sessions set studio_id = ${String(studioId)} where token_hash = ${auth.tokenHash}`;
    return c.json({ ok: true });
  });
});

// Everything the admin screens read synchronously: the account, its studios, and the
// current studio's members and albums with photos.
authRoutes.get("/bootstrap", async (c) => {
  const auth = c.get("auth");
  if (!auth) return c.json({ session: null });
  const studios = await asSystem((tx) =>
    tx.unsafe<Array<StudioRow & { role: Role }>>(
      `select ${STUDIO_COLUMNS.split(", ").map((column) => `s.${column}`).join(", ")}, m.role
       from memberships m join studios s on s.id = m.studio_id
       where m.user_id = $1 order by m.created_at, s.created_at`,
      [auth.user.id],
    ),
  );
  const current = auth.studio;
  const scoped =
    current && current.status === "active"
      ? await asStudio(current.id, async (tx) => ({
          members: await listMembers(tx, current.id),
          albums: await listAlbums(tx, current.id),
          pendingPayment: await getPendingStudioPayment(tx, current.id),
        }))
      : { members: [], albums: [], pendingPayment: null };
  return c.json({
    session: { userId: auth.user.id, studioId: auth.studioId, role: auth.role || "platform" },
    user: auth.user,
    studios: studios.map((row) => ({ studio: toStudio(row), role: row.role })),
    ...scoped,
  });
});

authRoutes.patch("/account", requireUser, async (c) => {
  const auth = c.get("auth")!;
  const body = await c.req.json().catch(() => ({}));
  const name = str(body.name, 120);
  const email = str(body.email, 200);
  const newPassword = String(body.newPassword ?? "");
  if (!name) return c.json({ error: "Vui lòng nhập họ và tên.", code: "name" }, 422);
  if (!EMAIL_RE.test(email)) return c.json({ error: "Vui lòng nhập email hợp lệ.", code: "email-format" }, 422);
  if (newPassword && newPassword.length < 6) return c.json({ error: "Mật khẩu mới phải có ít nhất 6 ký tự.", code: "password" }, 422);

  return asSystem(async (tx) => {
    if (await emailTaken(tx, email, auth.user.id)) return c.json({ error: "Email này đã được tài khoản khác sử dụng.", code: "email" }, 422);
    if (newPassword) {
      const [row] = await tx<Array<{ passwordHash: string }>>`select password_hash from users where id = ${auth.user.id}`;
      if (!(await verifyPassword(String(body.currentPassword ?? ""), row?.passwordHash))) {
        return c.json({ error: "Mật khẩu hiện tại không đúng.", code: "current" }, 422);
      }
      await tx`update users set password_hash = ${await hashPassword(newPassword)} where id = ${auth.user.id}`;
      // Other devices must sign in again with the new password.
      await tx`delete from sessions where user_id = ${auth.user.id} and token_hash <> ${auth.tokenHash}`;
    }
    await tx`update users set name = ${name}, email = ${email} where id = ${auth.user.id}`;
    return c.json({ user: { ...auth.user, name, email } });
  });
});

/* ---------- Profile photo ---------- */

// The browser crops and shrinks the photo before upload, so anything larger is not ours.
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

authRoutes.post("/account/avatar/upload", requireUser, async (c) => {
  const auth = c.get("auth")!;
  const key = `users/${auth.user.id}/avatar-${newId("ava")}.jpg`;
  return c.json({ key, uploadUrl: await presignUpload(key) });
});

// Replaces (or with an empty key, removes) the photo and deletes the previous file.
authRoutes.put("/account/avatar", requireUser, async (c) => {
  const auth = c.get("auth")!;
  const { key: sent } = await c.req.json().catch(() => ({}));
  const key = String(sent || "");
  if (key) {
    if (!isValidKey(key) || !/^users\/[A-Za-z0-9_-]+\/avatar-ava_[A-Za-z0-9]+\.jpg$/.test(key) || !key.startsWith(`users/${auth.user.id}/`)) {
      return c.json({ error: "Ảnh đại diện không hợp lệ." }, 422);
    }
    const size = await objectSize(key);
    if (size == null || size <= 0) return c.json({ error: "Không tìm thấy ảnh vừa tải lên." }, 422);
    if (size > MAX_AVATAR_BYTES || !(await isImageObject(key))) {
      await deleteObjects([key]);
      return c.json({ error: "Tệp này không phải ảnh hợp lệ." }, 422);
    }
  }
  const previous = await asSystem(async (tx) => {
    const [row] = await tx<Array<{ avatarKey: string }>>`select avatar_key from users where id = ${auth.user.id}`;
    await tx`update users set avatar_key = ${key} where id = ${auth.user.id}`;
    return row?.avatarKey || "";
  });
  if (previous && previous !== key) await deleteObjects([previous]);
  return c.json({ user: { ...auth.user, avatarUrl: publicUrl(key) || undefined } });
});
