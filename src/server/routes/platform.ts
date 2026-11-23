import { Hono } from "hono";
import { nextCycleExpiry, startOfNextMonthVN } from "@/lib/billing";
import { DEFAULT_PLAN_ID, getPlanById, PLANS } from "@/lib/plans";
import { studioSettings } from "@/lib/mock";
import { requirePlatform, requireUser, type AppEnv } from "../auth";
import { hashPassword, newId } from "../crypto";
import { asSystem } from "../db";
import {
  findStudio,
  getPlatformBank,
  PAYMENT_COLUMNS,
  STUDIO_COLUMNS,
  toBank,
  toPlatformPaymentRequest,
  toStudio,
  toUser,
  type PaymentRequestRow,
  type PlatformBankRow,
  type PlatformPaymentRow,
  type StudioRow,
  type Usage,
  type UserRow,
} from "../data";
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
    const planExpiresAt = plan.price > 0 ? startOfNextMonthVN() : null;
    await tx`
      insert into studios (id, slug, name, plan_id, plan_expires_at, settings)
      values (${studioId}, ${slug}, ${studioName}, ${plan.id}, ${planExpiresAt}, ${tx.json(studioSettings())})`;
    await tx`insert into memberships (user_id, studio_id, role) values (${owner.id}, ${studioId}, 'owner')`;
    return c.json({ existing, studio: toStudio((await findStudio(tx, studioId))!), owner }, 201);
  });
});

// The platform may move a studio to any plan; usage over the new limit only blocks new uploads.
platformRoutes.patch("/platform/studios/:id", async (c) => {
  const studioId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  return asSystem(async (tx) => {
    const current = await findStudio(tx, studioId);
    if (!current) return c.json({ error: "Không tìm thấy studio." }, 404);
    let warning = "";
    if (body.status !== undefined) {
      if (body.status !== "active" && body.status !== "suspended") return c.json({ error: "Trạng thái không hợp lệ." }, 422);
      await tx`update studios set status = ${body.status} where id = ${studioId}`;
    }
    if (body.planId !== undefined) {
      const plan = PLANS.find((item) => item.id === body.planId);
      if (!plan) return c.json({ error: "Gói không hợp lệ." }, 422);
      const nextExpiry = plan.price > 0 ? (current.planExpiresAt && current.planExpiresAt.getTime() > Date.now() ? current.planExpiresAt : startOfNextMonthVN()) : null;
      await tx`update studios set plan_id = ${plan.id}, plan_expires_at = ${nextExpiry} where id = ${studioId}`;
      warning = await planConflict(tx, studioId, plan);
    }
    if (body.planExpiresAt !== undefined) {
      if (body.planExpiresAt === null || body.planExpiresAt === "") {
        await tx`update studios set plan_expires_at = null where id = ${studioId}`;
      } else {
        const parsed = new Date(String(body.planExpiresAt));
        if (Number.isNaN(parsed.getTime())) return c.json({ error: "Ngày hết hạn không hợp lệ." }, 422);
        await tx`update studios set plan_expires_at = ${parsed} where id = ${studioId}`;
      }
    }
    return c.json({ studio: toStudio((await findStudio(tx, studioId))!), warning });
  });
});

/* ---------- Billing: VietQR config & payment approvals ---------- */

const PLATFORM_PAYMENT_SELECT = `
  select ${PAYMENT_COLUMNS.split(", ").map((col) => `r.${col}`).join(", ")},
    s.name as studio_name, s.slug as studio_slug, s.plan_id as current_plan_id, s.plan_expires_at as current_plan_expires_at,
    u.name as submitter_name, u.email as submitter_email
  from payment_requests r
  join studios s on s.id = r.studio_id
  left join users u on u.id = r.user_id`;

platformRoutes.get("/platform/billing", async (c) => {
  const [bank, rows] = await asSystem((tx) =>
    Promise.all([
      getPlatformBank(tx),
      tx.unsafe<PlatformPaymentRow[]>(
        `${PLATFORM_PAYMENT_SELECT}
         order by case when r.status = 'pending' then 0 else 1 end, r.created_at desc
         limit 200`,
      ),
    ]),
  );
  return c.json({ bank, requests: rows.map(toPlatformPaymentRequest) });
});

platformRoutes.put("/platform/bank", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const bankId = str(body.bankId, 20).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const bankAccount = str(body.bankAccount, 40).replace(/\s+/g, "");
  const accountName = str(body.accountName, 120).toUpperCase();
  const transferPrefix = str(body.transferPrefix, 16).toUpperCase().replace(/[^A-Z0-9]/g, "") || "PICORA";

  if (!bankId) return c.json({ error: "Vui lòng chọn ngân hàng." }, 422);
  if (!/^[A-Za-z0-9]{4,32}$/.test(bankAccount)) return c.json({ error: "Số tài khoản không hợp lệ." }, 422);
  if (!accountName) return c.json({ error: "Vui lòng nhập tên chủ tài khoản." }, 422);

  const bank = await asSystem(async (tx) => {
    const [row] = await tx<PlatformBankRow[]>`
      insert into platform_settings (id, bank_id, bank_account, account_name, transfer_prefix, updated_at)
      values ('default', ${bankId}, ${bankAccount}, ${accountName}, ${transferPrefix}, now())
      on conflict (id) do update
        set bank_id = excluded.bank_id,
            bank_account = excluded.bank_account,
            account_name = excluded.account_name,
            transfer_prefix = excluded.transfer_prefix,
            updated_at = now()
      returning bank_id, bank_account, account_name, transfer_prefix, updated_at`;
    return toBank(row);
  });
  return c.json({ bank });
});

platformRoutes.post("/platform/payments/:id/approve", async (c) => {
  const auth = c.get("auth")!;
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const adminNote = str(body.note, 500);

  return asSystem(async (tx) => {
    const [req] = await tx<PaymentRequestRow[]>`
      select ${tx.unsafe(PAYMENT_COLUMNS)} from payment_requests where id = ${id} for update`;
    if (!req) return c.json({ error: "Không tìm thấy yêu cầu thanh toán." }, 404);
    if (req.status !== "pending") return c.json({ error: "Yêu cầu này đã được xử lý trước đó." }, 409);

    const studio = await findStudio(tx, req.studioId);
    if (!studio) return c.json({ error: "Không tìm thấy studio." }, 404);
    const targetPlan = getPlanById(req.targetPlanId);
    const expiresAt = nextCycleExpiry(
      studio.planId,
      studio.planExpiresAt ? studio.planExpiresAt.toISOString() : null,
      targetPlan.id,
      req.kind,
    );

    await tx`update studios set plan_id = ${targetPlan.id}, plan_expires_at = ${expiresAt} where id = ${studio.id}`;
    await tx`
      update payment_requests
      set status = 'approved', admin_note = ${adminNote}, reviewed_by = ${auth.user.id}, reviewed_at = now(), applied_expires_at = ${expiresAt}
      where id = ${id}`;

    const warning = await planConflict(tx, studio.id, targetPlan);
    const [updatedStudio, updatedReqRows] = await Promise.all([
      findStudio(tx, studio.id),
      tx.unsafe<PlatformPaymentRow[]>(`${PLATFORM_PAYMENT_SELECT} where r.id = $1`, [id]),
    ]);
    return c.json({
      studio: toStudio(updatedStudio!),
      request: toPlatformPaymentRequest(updatedReqRows[0]),
      warning,
    });
  });
});

platformRoutes.post("/platform/payments/:id/reject", async (c) => {
  const auth = c.get("auth")!;
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const adminNote = str(body.note, 500);
  if (!adminNote) return c.json({ error: "Vui lòng nhập lý do từ chối." }, 422);

  return asSystem(async (tx) => {
    const [req] = await tx<PaymentRequestRow[]>`
      select ${tx.unsafe(PAYMENT_COLUMNS)} from payment_requests where id = ${id} for update`;
    if (!req) return c.json({ error: "Không tìm thấy yêu cầu thanh toán." }, 404);
    if (req.status !== "pending") return c.json({ error: "Yêu cầu này đã được xử lý trước đó." }, 409);

    await tx`
      update payment_requests
      set status = 'rejected', admin_note = ${adminNote}, reviewed_by = ${auth.user.id}, reviewed_at = now()
      where id = ${id}`;

    const [updatedReq] = await tx.unsafe<PlatformPaymentRow[]>(`${PLATFORM_PAYMENT_SELECT} where r.id = $1`, [id]);
    return c.json({ request: toPlatformPaymentRequest(updatedReq) });
  });
});
