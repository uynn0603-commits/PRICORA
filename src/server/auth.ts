import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import type { Role, StudioStatus, User } from "@/lib/types";
import { randomToken, sha256 } from "./crypto";
import { asSystem, type Tx } from "./db";
import { env } from "./env";
import { toUser, type UserRow } from "./data";

export const SESSION_COOKIE = "picora_session";
const REMEMBER_DAYS = 30;
const SHORT_HOURS = 12;

export interface Auth {
  tokenHash: string;
  user: User;
  studioId: string | null;
  role: Role | null;
  studio: { id: string; status: StudioStatus; planId: string; planExpiresAt: string | null; planExpired: boolean } | null;
}

export type AppEnv = { Variables: { auth: Auth | null } };

export async function startSession(c: Context, tx: Tx, userId: string, studioId: string | null, remember: boolean) {
  const token = randomToken();
  const ttl = remember ? REMEMBER_DAYS * 86400 : SHORT_HOURS * 3600;
  await tx`
    insert into sessions (token_hash, user_id, studio_id, expires_at)
    values (${sha256(token)}, ${userId}, ${studioId}, now() + make_interval(secs => ${ttl}))`;
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: env.secureCookies,
    path: "/",
    ...(remember ? { maxAge: ttl } : {}),
  });
}

export function endSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

interface SessionRow extends UserRow {
  tokenHash: string;
  studioId: string | null;
  role: Role | null;
  studioStatus: StudioStatus | null;
  planId: string | null;
  planExpiresAt: Date | null;
}

// A session is only valid while its user still belongs to the session's studio;
// a session without a studio is only valid for platform admins.
export const loadAuth: MiddlewareHandler<AppEnv> = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  let auth: Auth | null = null;
  if (token) {
    const [row] = await asSystem((tx) => tx<SessionRow[]>`
      select s.token_hash, s.studio_id, u.id, u.name, u.email, u.platform_admin, u.avatar_key, m.role,
        st.status as studio_status, st.plan_id, st.plan_expires_at
      from sessions s
      join users u on u.id = s.user_id
      left join memberships m on m.user_id = s.user_id and m.studio_id = s.studio_id
      left join studios st on st.id = s.studio_id
      where s.token_hash = ${sha256(token)} and s.expires_at > now()`);
    const valid = row && (row.studioId ? Boolean(row.role) : row.platformAdmin);
    if (valid) {
      const planExpiresAt = row.planExpiresAt ? row.planExpiresAt.toISOString() : null;
      const planExpired = Boolean(row.planId && row.planId !== "free" && row.planExpiresAt && row.planExpiresAt.getTime() <= Date.now());
      auth = {
        tokenHash: row.tokenHash,
        user: toUser(row),
        studioId: row.studioId,
        role: row.role,
        studio: row.studioId ? { id: row.studioId, status: row.studioStatus!, planId: row.planId!, planExpiresAt, planExpired } : null,
      };
    } else endSessionCookie(c);
  }
  c.set("auth", auth);
  await next();
});

export const OWNER_ONLY = "Chỉ chủ studio mới thực hiện được thao tác này.";

export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get("auth")) return c.json({ error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", code: "session" }, 401);
  await next();
});

export const requireStudio = createMiddleware<AppEnv>(async (c, next) => {
  const auth = c.get("auth");
  if (!auth) return c.json({ error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", code: "session" }, 401);
  if (!auth.studio) return c.json({ error: "Chưa chọn studio.", code: "studio" }, 403);
  if (auth.studio.status !== "active") return c.json({ error: "Studio đang bị tạm khóa.", code: "suspended" }, 403);
  await next();
});

export const requireOwner = createMiddleware<AppEnv>(async (c, next) => {
  if (c.get("auth")?.role !== "owner") return c.json({ error: OWNER_ONLY }, 403);
  await next();
});

export const requireActivePlan = createMiddleware<AppEnv>(async (c, next) => {
  if (c.get("auth")?.studio?.planExpired) {
    return c.json(
      { error: "Gói dịch vụ đã hết hạn. Vui lòng gia hạn tại Cài đặt → Gói dịch vụ và chờ quản trị viên duyệt.", code: "plan_expired" },
      402,
    );
  }
  await next();
});

export const requirePlatform = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get("auth")?.user.platformAdmin) return c.json({ error: "Chỉ quản trị nền tảng mới truy cập được." }, 403);
  await next();
});

// For handlers behind requireStudio: the session's studio is guaranteed.
export function studioOf(c: Context<AppEnv>) {
  const auth = c.get("auth")!;
  return { auth, studioId: auth.studio!.id, planId: auth.studio!.planId };
}
