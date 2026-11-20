import { Hono } from "hono";
import { isHex } from "@/lib/format";
import { getPlanById, PLANS } from "@/lib/plans";
import type { StudioSettings } from "@/lib/types";
import { OWNER_ONLY, requireOwner, requireStudio, studioOf, type AppEnv } from "../auth";
import { hashPassword, newId } from "../crypto";
import { asStudio, asSystem, type Tx } from "../db";
import { findStudio, listMembers, studioUsage, toStudio } from "../data";
import { EMAIL_RE, planConflict, slugify, str, studioSlugError } from "../rules";
import { reseed } from "../seed";
import { env } from "../env";

export const studioRoutes = new Hono<AppEnv>();

const owner = [requireStudio, requireOwner] as const;

studioRoutes.patch("/studio", ...owner, async (c) => {
  const { studioId } = studioOf(c);
  const body = await c.req.json().catch(() => ({}));
  return asSystem(async (tx) => {
    if (body.slug !== undefined) {
      const slug = slugify(body.slug);
      const error = await studioSlugError(tx, slug, studioId);
      if (error) return c.json({ error }, 422);
      await tx`update studios set slug = ${slug} where id = ${studioId}`;
    }
    if (body.name !== undefined) {
      const name = str(body.name, 120);
      if (!name) return c.json({ error: "Vui lòng nhập tên studio." }, 422);
      await tx`update studios set name = ${name} where id = ${studioId}`;
    }
    return c.json({ studio: toStudio((await findStudio(tx, studioId))!) });
  });
});

const LOGO_MAX = 1_200_000;

function cleanSettings(input: Record<string, unknown>): Partial<StudioSettings> | string {
  const patch: Partial<StudioSettings> = {};
  if ("defaultExpirationDays" in input) {
    const days = Math.round(Number(input.defaultExpirationDays));
    if (!Number.isFinite(days) || days < 1 || days > 3650) return "Thời hạn phải từ 1 đến 3650 ngày.";
    patch.defaultExpirationDays = days;
  }
  if ("defaultPasswordProtection" in input) patch.defaultPasswordProtection = Boolean(input.defaultPasswordProtection);
  if ("slogan" in input) patch.slogan = str(input.slogan, 160) || "Your Photos. Your Memories.";
  for (const key of ["primaryColor", "secondaryColor"] as const) {
    if (key in input) {
      if (!isHex(String(input[key]))) return "Hãy dùng mã màu hex 6 ký tự, ví dụ #7552F6.";
      patch[key] = String(input[key]);
    }
  }
  if ("logoDataUrl" in input) {
    const logo = String(input.logoDataUrl || "");
    if (logo && (!/^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(logo) || logo.length > LOGO_MAX)) return "Logo không hợp lệ hoặc vượt 800 KB.";
    patch.logoDataUrl = logo;
  }
  return patch;
}

studioRoutes.patch("/studio/settings", ...owner, async (c) => {
  const { studioId } = studioOf(c);
  const patch = cleanSettings(await c.req.json().catch(() => ({})));
  if (typeof patch === "string") return c.json({ error: patch }, 422);
  return asSystem(async (tx) => {
    await tx`update studios set settings = settings || ${tx.json(patch)} where id = ${studioId}`;
    return c.json({ studio: toStudio((await findStudio(tx, studioId))!) });
  });
});

studioRoutes.put("/studio/plan", ...owner, async (c) => {
  const { studioId } = studioOf(c);
  const { planId } = await c.req.json().catch(() => ({}));
  const plan = PLANS.find((item) => item.id === planId);
  if (!plan) return c.json({ error: "Gói không hợp lệ." }, 422);
  return asStudio(studioId, async (tx) => {
    const conflict = await planConflict(tx, studioId, plan);
    if (conflict) return c.json({ error: conflict }, 422);
    await tx`update studios set plan_id = ${plan.id} where id = ${studioId}`;
    return c.json({ studio: toStudio((await findStudio(tx, studioId))!) });
  });
});

/* ---------- Members (owner only) ---------- */

studioRoutes.post("/members", ...owner, async (c) => {
  const { studioId, planId } = studioOf(c);
  const body = await c.req.json().catch(() => ({}));
  const email = str(body.email, 200);
  const plan = getPlanById(planId);
  return asStudio(studioId, async (tx) => {
    if ((await studioUsage(tx, studioId)).members >= plan.members) {
      return c.json({ error: `Gói ${plan.name} cho phép tối đa ${plan.members} thành viên.` }, 422);
    }
    if (!EMAIL_RE.test(email)) return c.json({ error: "Vui lòng nhập email hợp lệ." }, 422);
    let [user] = await tx<Array<{ id: string; name: string }>>`select id, name from users where lower(email) = lower(${email})`;
    if (user) {
      const [already] = await tx`select 1 from memberships where user_id = ${user.id} and studio_id = ${studioId}`;
      if (already) return c.json({ error: "Người này đã là thành viên của studio." }, 422);
    }
    const existing = Boolean(user);
    if (!user) {
      const name = str(body.name, 120);
      const password = String(body.password ?? "");
      if (!name) return c.json({ error: "Vui lòng nhập họ và tên." }, 422);
      if (password.length < 6) return c.json({ error: "Mật khẩu tạm cần ít nhất 6 ký tự." }, 422);
      user = { id: newId("usr"), name };
      await tx`insert into users (id, name, email, password_hash) values (${user.id}, ${name}, ${email}, ${await hashPassword(password)})`;
    }
    const role = body.role === "owner" ? "owner" : "staff";
    await tx`insert into memberships (user_id, studio_id, role) values (${user.id}, ${studioId}, ${role})`;
    return c.json({ existing, name: user.name, members: await listMembers(tx, studioId) });
  });
});

async function ownerCount(tx: Tx, studioId: string) {
  const [row] = await tx<Array<{ count: number }>>`select count(*)::int as count from memberships where studio_id = ${studioId} and role = 'owner'`;
  return row.count;
}

studioRoutes.patch("/members/:userId", ...owner, async (c) => {
  const { studioId } = studioOf(c);
  const userId = c.req.param("userId");
  const { role } = await c.req.json().catch(() => ({}));
  if (role !== "owner" && role !== "staff") return c.json({ error: "Không tìm thấy thành viên." }, 422);
  return asStudio(studioId, async (tx) => {
    const [member] = await tx<Array<{ role: string }>>`select role from memberships where user_id = ${userId} and studio_id = ${studioId}`;
    if (!member) return c.json({ error: "Không tìm thấy thành viên." }, 404);
    if (member.role === "owner" && role !== "owner" && (await ownerCount(tx, studioId)) <= 1) {
      return c.json({ error: "Studio cần ít nhất một chủ studio." }, 422);
    }
    await tx`update memberships set role = ${role} where user_id = ${userId} and studio_id = ${studioId}`;
    return c.json({ members: await listMembers(tx, studioId) });
  });
});

studioRoutes.delete("/members/:userId", ...owner, async (c) => {
  const { auth, studioId } = studioOf(c);
  const userId = c.req.param("userId");
  if (userId === auth.user.id) return c.json({ error: "Bạn không thể tự xóa mình khỏi studio." }, 422);
  return asStudio(studioId, async (tx) => {
    const [member] = await tx<Array<{ role: string }>>`select role from memberships where user_id = ${userId} and studio_id = ${studioId}`;
    if (!member) return c.json({ error: "Không tìm thấy thành viên." }, 404);
    if (member.role === "owner" && (await ownerCount(tx, studioId)) <= 1) return c.json({ error: "Studio cần ít nhất một chủ studio." }, 422);
    await tx`delete from memberships where user_id = ${userId} and studio_id = ${studioId}`;
    await tx`delete from sessions where user_id = ${userId} and studio_id = ${studioId}`;
    return c.json({ members: await listMembers(tx, studioId) });
  });
});

/* ---------- Demo data ---------- */

studioRoutes.post("/demo/reset", async (c) => {
  const auth = c.get("auth");
  if (!env.allowDemoReset) return c.json({ error: "Máy chủ này không cho phép khôi phục dữ liệu demo." }, 403);
  if (!auth || (auth.role !== "owner" && !auth.user.platformAdmin)) return c.json({ error: OWNER_ONLY }, 403);
  await reseed({ keepSession: auth.tokenHash });
  return c.json({ ok: true });
});
