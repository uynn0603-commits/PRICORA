import { Hono } from "hono";
import { DEFAULT_PLAN_ID, getPlanById, PLANS } from "@/lib/plans";
import { studioSettings } from "@/lib/mock";
import { requirePlatform, requireUser, type AppEnv } from "../auth";
import { hashPassword, newId } from "../crypto";
import { asSystem } from "../db";
import { findStudio, STUDIO_COLUMNS, toStudio, toUser, type StudioRow, type Usage, type UserRow } from "../data";
import { EMAIL_RE, planConflict, slugify, str, studioSlugError } from "../rules";

export const platformRoutes = new Hono<AppEnv>();

platformRoutes.use("/platform/*", requireUser, requirePlatform);

platformRoutes.get("/platform/studios", async (c) => {
  const rows = await asSystem((tx) =>
    tx.unsafe<Array<StudioRow & Usage & { ownerId: string | null; ownerName: string | null; ownerEmail: string | null }>>(`
      select ${STUDIO_COLUMNS.split(", ").map((column) => `s.${column}`).join(", ")},
        (select count(*)::int from albums a where a.studio_id = s.id) as albums,
        (select count(*)::int from photos p where p.studio_id = s.id) as photos,
        (select coalesce(sum(p.size), 0)::float8 from photos p where p.studio_id = s.id) as storage,
        (select count(*)::int from memberships m where m.studio_id = s.id) as members,
        o.id as owner_id, o.name as owner_name, o.email as owner_email
      from studios s
      left join lateral (
        select u.id, u.name, u.email from memberships m join users u on u.id = m.user_id
        where m.studio_id = s.id and m.role = 'owner' order by m.created_at limit 1
      ) o on true
      order by s.created_at desc`),
  );
  return c.json({
    studios: rows.map((row) => ({
      studio: toStudio(row),
      usage: { albums: row.albums, photos: row.photos, storage: row.storage, members: row.members },
      owner: row.ownerId ? toUser({ id: row.ownerId, name: row.ownerName!, email: row.ownerEmail!, platformAdmin: false } as UserRow) : null,
    })),
  });
});

// An existing account becomes owner as-is; a new email needs a name and temporary password.
platformRoutes.post("/platform/studios", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const studioName = str(body.studioName, 120);
  const slug = slugify(body.studioSlug || studioName);
  const email = str(body.ownerEmail, 200);
  const plan = PLANS.find((item) => item.id === body.planId) || getPlanById(DEFAULT_PLAN_ID);

  return asSystem(async (tx) => {
    const errors: Record<string, string> = {};
    if (!studioName) errors.studioName = "Vui lòng nhập tên studio.";
    const slugError = await studioSlugError(tx, slug);
    if (slugError) errors.studioSlug = slugError;
    let owner: { id: string; name: string; email: string } | null = null;
    if (!EMAIL_RE.test(email)) errors.ownerEmail = "Vui lòng nhập email hợp lệ.";
    else owner = (await tx<Array<{ id: string; name: string; email: string }>>`select id, name, email from users where lower(email) = lower(${email})`)[0] || null;
    const ownerName = str(body.ownerName, 120);
    const ownerPassword = String(body.ownerPassword ?? "");
    if (!owner) {
      if (!ownerName) errors.ownerName = "Vui lòng nhập họ và tên chủ studio.";
      if (ownerPassword.length < 6) errors.ownerPassword = "Mật khẩu tạm cần ít nhất 6 ký tự.";
    }
    if (Object.keys(errors).length) return c.json({ errors }, 422);

    const existing = Boolean(owner);
    if (!owner) {
      owner = { id: newId("usr"), name: ownerName, email };
      await tx`insert into users (id, name, email, password_hash) values (${owner.id}, ${ownerName}, ${email}, ${await hashPassword(ownerPassword)})`;
    }
    const studioId = newId("std");
    await tx`insert into studios (id, slug, name, plan_id, settings) values (${studioId}, ${slug}, ${studioName}, ${plan.id}, ${tx.json(studioSettings())})`;
    await tx`insert into memberships (user_id, studio_id, role) values (${owner.id}, ${studioId}, 'owner')`;
    return c.json({ existing, studio: toStudio((await findStudio(tx, studioId))!), owner }, 201);
  });
});

// The platform may move a studio to any plan; usage over the new limit only blocks new uploads.
platformRoutes.patch("/platform/studios/:id", async (c) => {
  const studioId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  return asSystem(async (tx) => {
    if (!(await findStudio(tx, studioId))) return c.json({ error: "Không tìm thấy studio." }, 404);
    let warning = "";
    if (body.status !== undefined) {
      if (body.status !== "active" && body.status !== "suspended") return c.json({ error: "Trạng thái không hợp lệ." }, 422);
      await tx`update studios set status = ${body.status} where id = ${studioId}`;
    }
    if (body.planId !== undefined) {
      const plan = PLANS.find((item) => item.id === body.planId);
      if (!plan) return c.json({ error: "Gói không hợp lệ." }, 422);
      await tx`update studios set plan_id = ${plan.id} where id = ${studioId}`;
      warning = await planConflict(tx, studioId, plan);
    }
    return c.json({ studio: toStudio((await findStudio(tx, studioId))!), warning });
  });
});
