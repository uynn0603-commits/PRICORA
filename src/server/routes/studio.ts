import { Hono } from "hono";
import { isBankConfigured } from "@/lib/billing";
import { isHex } from "@/lib/format";
import { getPlanById, PLANS } from "@/lib/plans";
import type { StudioSettings } from "@/lib/types";
import { OWNER_ONLY, requireActivePlan, requireOwner, requireStudio, studioOf, type AppEnv } from "../auth";
import { hashPassword, newId } from "../crypto";
import { asStudio, asSystem, type Tx } from "../db";
import {
  findStudio,
  getPendingStudioPayment,
  getPlatformBank,
  listMembers,
  listStudioPayments,
  PAYMENT_COLUMNS,
  studioUsage,
  toPaymentRequest,
  toStudio,
  type PaymentRequestRow,
} from "../data";
import { EMAIL_RE, planConflict, slugify, str, studioSlugError } from "../rules";
import { reseed } from "../seed";
import { env } from "../env";
import { deleteObjects, isImageObject, isValidKey, objectSize, presignUpload } from "../storage";

export const studioRoutes = new Hono<AppEnv>();

const owner = [requireStudio, requireOwner] as const;
const activeOwner = [requireStudio, requireOwner, requireActivePlan] as const;

const RECEIPT_EXT = new Set(["jpg", "jpeg", "png", "webp"]);
const RECEIPT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

studioRoutes.patch("/studio", ...activeOwner, async (c) => {
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

studioRoutes.patch("/studio/settings", ...activeOwner, async (c) => {
  const { studioId } = studioOf(c);
  const patch = cleanSettings(await c.req.json().catch(() => ({})));
  if (typeof patch === "string") return c.json({ error: patch }, 422);
  return asSystem(async (tx) => {
    await tx`update studios set settings = settings || ${tx.json(patch)} where id = ${studioId}`;
    return c.json({ studio: toStudio((await findStudio(tx, studioId))!) });
  });
});

// Direct plan change is only allowed for the free plan (0đ). Paid plans go through
// bank transfer confirmation + platform admin approval.
studioRoutes.put("/studio/plan", ...owner, async (c) => {
  const { studioId } = studioOf(c);
  const { planId } = await c.req.json().catch(() => ({}));
  const plan = PLANS.find((item) => item.id === planId);
  if (!plan) return c.json({ error: "Gói không hợp lệ." }, 422);
  if (plan.price > 0) return c.json({ error: "Gói trả phí cần chuyển khoản QR và chờ quản trị viên duyệt." }, 422);
  return asStudio(studioId, async (tx) => {
    const conflict = await planConflict(tx, studioId, plan);
    if (conflict) return c.json({ error: conflict }, 422);
    await tx`update studios set plan_id = ${plan.id}, plan_expires_at = null where id = ${studioId}`;
    return c.json({ studio: toStudio((await findStudio(tx, studioId))!) });
  });
});

/* ---------- Plan payments (VietQR + receipt confirmation) ---------- */

studioRoutes.get("/studio/billing", ...owner, async (c) => {
  const { studioId } = studioOf(c);
  const [bank, requests] = await Promise.all([
    asSystem((tx) => getPlatformBank(tx)),
    asStudio(studioId, (tx) => listStudioPayments(tx, studioId)),
  ]);
  return c.json({ bank, requests });
});

studioRoutes.post("/studio/payments/upload", ...owner, async (c) => {
  const { studioId } = studioOf(c);
  const body = await c.req.json().catch(() => ({}));
  const rawExt = String(body.name || "").split(".").pop()?.toLowerCase() || "";
  const type = String(body.type || "");
  const size = Number(body.size) || 0;
  if (!RECEIPT_EXT.has(rawExt) || (type && !RECEIPT_TYPES.has(type)) || size <= 0) {
    return c.json({ error: "Chỉ chấp nhận ảnh xác nhận JPG, PNG hoặc WEBP." }, 422);
  }
  if (size > MAX_RECEIPT_BYTES) return c.json({ error: "Ảnh xác nhận vượt quá 10 MB." }, 422);
  const ext = rawExt === "jpeg" ? "jpg" : rawExt;
  const paymentId = newId("pay");
  const key = `studios/${studioId}/payments/${paymentId}.${ext}`;
  return c.json({ paymentId, key, uploadUrl: await presignUpload(key) });
});

studioRoutes.post("/studio/payments", ...owner, async (c) => {
  const { auth, studioId } = studioOf(c);
  const body = await c.req.json().catch(() => ({}));
  const paymentId = String(body.paymentId || "");
  const receiptKey = String(body.receiptKey || "");
  const targetPlan = PLANS.find((item) => item.id === body.targetPlanId);
  const kind = body.kind === "renew" ? "renew" : body.kind === "change" ? "change" : "";
  const transferCode = str(body.transferCode, 80);
  const note = str(body.note, 500);

  const reject = async (error: string, status: 409 | 422 = 422) => {
    if (isValidKey(receiptKey) && receiptKey.startsWith(`studios/${studioId}/payments/`)) {
      await deleteObjects([receiptKey]);
    }
    return c.json({ error }, status);
  };

  if (!/^pay_[A-Za-z0-9]+$/.test(paymentId) || !receiptKey.startsWith(`studios/${studioId}/payments/${paymentId}.`) || !isValidKey(receiptKey)) {
    return c.json({ error: "Ảnh xác nhận chuyển khoản không hợp lệ." }, 422);
  }
  if (!targetPlan || targetPlan.price <= 0) return reject("Chỉ gói trả phí mới cần gửi xác nhận chuyển khoản.");
  if (!kind) return reject("Loại yêu cầu thanh toán không hợp lệ.");
  if (!transferCode) return reject("Thiếu nội dung chuyển khoản.");

  const size = await objectSize(receiptKey);
  if (size == null || size <= 0) return c.json({ error: "Không tìm thấy ảnh xác nhận vừa tải lên." }, 422);
  if (size > MAX_RECEIPT_BYTES || !(await isImageObject(receiptKey))) {
    return reject("Tệp xác nhận không phải ảnh JPG, PNG hoặc WEBP hợp lệ.");
  }

  const bank = await asSystem((tx) => getPlatformBank(tx));
  if (!isBankConfigured(bank)) return reject("Quản trị nền tảng chưa cấu hình tài khoản ngân hàng nhận tiền.");

  const result = await asStudio(studioId, async (tx) => {
    const studio = await findStudio(tx, studioId);
    if (!studio) return { status: 404 as const, error: "Không tìm thấy studio." };
    const existingPending = await getPendingStudioPayment(tx, studioId);
    if (existingPending) return { status: 409 as const, error: "Studio đang có một yêu cầu chờ duyệt. Hãy hủy yêu cầu cũ trước khi gửi yêu cầu mới." };
    if (kind === "renew" && targetPlan.id !== studio.planId) {
      return { status: 422 as const, error: "Gói gia hạn không khớp với gói hiện tại của studio." };
    }
    if (kind === "change" && targetPlan.id === studio.planId) {
      return { status: 422 as const, error: "Studio đang dùng gói này. Hãy chọn Gia hạn nếu bạn muốn đóng tiền cho tháng tiếp theo." };
    }
    if (kind === "change") {
      const conflict = await planConflict(tx, studioId, targetPlan);
      if (conflict) return { status: 422 as const, error: conflict };
    }
    const [row] = await tx<PaymentRequestRow[]>`
      insert into payment_requests (id, studio_id, user_id, kind, target_plan_id, amount, transfer_code, receipt_key, note)
      values (${paymentId}, ${studioId}, ${auth.user.id}, ${kind}, ${targetPlan.id}, ${targetPlan.price}, ${transferCode}, ${receiptKey}, ${note})
      returning ${tx.unsafe(PAYMENT_COLUMNS)}`;
    return { request: toPaymentRequest(row) };
  });

  if ("error" in result) {
    await deleteObjects([receiptKey]);
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result, 201);
});

studioRoutes.delete("/studio/payments/:id", ...owner, async (c) => {
  const { studioId } = studioOf(c);
  const id = c.req.param("id");
  const deleted = await asStudio(studioId, async (tx) => {
    const [row] = await tx<Array<{ receiptKey: string }>>`
      delete from payment_requests
      where id = ${id} and studio_id = ${studioId} and status = 'pending'
      returning receipt_key`;
    return row || null;
  });
  if (!deleted) return c.json({ error: "Không tìm thấy yêu cầu đang chờ duyệt." }, 404);
  if (deleted.receiptKey) await deleteObjects([deleted.receiptKey]);
  return c.json({ ok: true });
});

/* ---------- Members (owner only) ---------- */

studioRoutes.post("/members", ...activeOwner, async (c) => {
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

studioRoutes.patch("/members/:userId", ...activeOwner, async (c) => {
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

studioRoutes.delete("/members/:userId", ...activeOwner, async (c) => {
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
