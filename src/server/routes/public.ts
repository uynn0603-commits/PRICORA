import { Hono, type Context } from "hono";
import type { Album } from "@/lib/types";
import type { AppEnv } from "../auth";
import { safeEqual } from "../crypto";
import { asSystem } from "../db";
import { findStudioBySlug } from "../data";
import { albumToken, resolveGallery } from "../gallery";

export const publicRoutes = new Hono<AppEnv>();

// Clients never receive the album password; this marker only says one is set.
const PASSWORD_MARKER = "protected";

const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 10 * 60 * 1000;

// Per-process limiter for password guesses; enough to slow down guessing on one instance.
function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.until < now) {
    attempts.set(key, { count: 1, until: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

function accessFor(c: Context<AppEnv>) {
  return { studioId: c.get("auth")?.studioId, token: c.req.header("x-album-token") || "" };
}

publicRoutes.get("/public/:studio/:album", async (c) => {
  return asSystem(async (tx) => {
    const { state, admin, status, studio, album } = await resolveGallery(tx, c.req.param("studio"), c.req.param("album"), accessFor(c));
    if (!album) return c.json({ state, admin, studio, album: null });
    const visible: Album = admin ? album : { ...album, password: album.password ? PASSWORD_MARKER : "", customerPhone: "" };
    if (state !== "ok") {
      // Enough for the title and the blurred cover behind the password form.
      const cover = album.photos.find((photo) => photo.id === album.coverId) || album.photos[0];
      visible.photos = state === "password" && cover ? [cover] : [];
      visible.selection = null;
    }
    return c.json({ state, admin, status, studio, album: visible });
  });
});

// The client's photo picks. Re-sending replaces the previous list until the studio locks it.
publicRoutes.put("/public/:studio/:album/selection", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.photoIds) ? [...new Set(body.photoIds.map(String))] as string[] : [];
  const note = String(body.note ?? "").trim().slice(0, 2000);
  return asSystem(async (tx) => {
    const { state, admin, album } = await resolveGallery(tx, c.req.param("studio"), c.req.param("album"), accessFor(c));
    if (!album || state !== "ok") return c.json({ error: "Album không khả dụng." }, 404);
    if (admin) return c.json({ error: "Đây là chế độ xem trước của studio; chỉ khách hàng mới gửi được lựa chọn." }, 403);
    if (!album.selectionEnabled) return c.json({ error: "Album này không bật chọn ảnh." }, 422);
    if (album.selectionLocked) return c.json({ error: "Studio đã chốt danh sách ảnh, không thể thay đổi nữa." }, 423);
    const known = new Set(album.photos.map((photo) => photo.id));
    const picked = album.photos.filter((photo) => ids.includes(photo.id)).map((photo) => photo.id);
    if (ids.some((id) => !known.has(id))) return c.json({ error: "Một số ảnh không còn trong album. Vui lòng tải lại trang." }, 422);
    if (!picked.length) return c.json({ error: "Hãy chọn ít nhất một ảnh." }, 422);
    if (album.selectionLimit && picked.length > album.selectionLimit) {
      return c.json({ error: `Bạn chỉ được chọn tối đa ${album.selectionLimit} ảnh.` }, 422);
    }
    const [row] = await tx<Array<{ submittedAt: Date }>>`
      insert into album_selections (album_id, studio_id, photo_ids, note, submitted_at)
      values (${album.id}, ${album.studioId}, ${picked}, ${note}, now())
      on conflict (album_id) do update set photo_ids = excluded.photo_ids, note = excluded.note, submitted_at = now()
      returning submitted_at`;
    return c.json({ selection: { photoIds: picked, note, submittedAt: row.submittedAt.toISOString() } });
  });
});

publicRoutes.post("/public/:studio/:album/unlock", async (c) => {
  const { password } = await c.req.json().catch(() => ({}));
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const studioSlug = c.req.param("studio");
  const albumSlug = c.req.param("album");
  if (tooManyAttempts(`${ip}:${studioSlug}/${albumSlug}`)) {
    return c.json({ error: "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút." }, 429);
  }
  return asSystem(async (tx) => {
    const studio = await findStudioBySlug(tx, studioSlug);
    const [album] = studio
      ? await tx<Array<{ id: string; password: string }>>`select id, password from albums where studio_id = ${studio.id} and slug = ${albumSlug}`
      : [];
    if (!album?.password || !safeEqual(String(password ?? "").trim(), album.password)) {
      return c.json({ error: "Mật khẩu không đúng. Vui lòng thử lại." }, 401);
    }
    return c.json({ token: albumToken(album) });
  });
});

// Links from before studios existed were /gallery/:slug.
publicRoutes.get("/public-legacy/:slug", async (c) => {
  const [row] = await asSystem((tx) => tx<Array<{ studioSlug: string; albumSlug: string }>>`
    select s.slug as studio_slug, a.slug as album_slug from albums a join studios s on s.id = a.studio_id
    where a.slug = ${c.req.param("slug")} order by a.created_at limit 1`);
  if (!row) return c.json({ error: "Không tìm thấy album." }, 404);
  return c.json({ path: `/s/${row.studioSlug}/${row.albumSlug}` });
});
