import { createSeed, PICORA_DEFAULTS, SEED_TEMPLATES } from "./mock.js";
import { isTemplateId, suggestTemplateId } from "../components/templates/catalog.js";
import {
  clearMemory,
  forgetUrl,
  getCoverMemory,
  measureImage,
  readFileWithProgress,
  rememberUrl,
  setCoverMemory,
} from "./media.js";
import { daysUntil, parseISODate, slugify, toISODate } from "../utils/format.js";
import { toast } from "../components/toast.js";

const KEY = "view.db.v1";
const SESSION_KEY = "view.session";
const UNLOCK_KEY = "view.unlocked";
export const STORAGE_QUOTA = 4.8 * 1024 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ACCEPTED_EXT = new Set(["jpg", "jpeg", "png", "webp"]);

const VERSION = 2;

let db = load() || createSeed();
applyBrand(db.settings);
persist();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.albums) || ![1, VERSION].includes(parsed.version)) return null;
    return migrate(parsed);
  } catch {
    return null;
  }
}

// v1 → v2: every album gets a display template and a download setting; the old
// "view." brand defaults move to PICORA. Albums, photos and links are untouched.
function migrate(data) {
  data.albums.forEach((album) => {
    if (!isTemplateId(album.templateId)) album.templateId = SEED_TEMPLATES[album.id] || suggestTemplateId(album.occasion);
    if (typeof album.allowDownload !== "boolean") album.allowDownload = true;
  });
  if (data.version === 1) {
    if (/^view\.?$/i.test(data.settings.platformName || "")) data.settings.platformName = PICORA_DEFAULTS.platformName;
    if (!data.settings.slogan || data.settings.slogan === "Your Moments, One Place.") data.settings.slogan = PICORA_DEFAULTS.slogan;
  }
  data.version = VERSION;
  return data;
}

function payload() {
  return {
    version: VERSION,
    credentials: db.credentials,
    settings: db.settings,
    notificationsRead: db.notificationsRead || [],
    albums: db.albums,
  };
}

function persist() {
  const json = JSON.stringify(payload());
  try {
    localStorage.setItem(KEY, json);
  } catch {
    db.albums.forEach((album) => {
      if (album.coverDataUrl && album.coverDataUrl.length > 180000) album.coverDataUrl = "";
    });
    try {
      localStorage.setItem(KEY, JSON.stringify(payload()));
      toast("Ảnh bìa quá lớn nên sẽ không được giữ sau khi tải lại trang.", "info");
    } catch {
      toast("Trình duyệt đã chặn lưu cục bộ. Thay đổi chỉ giữ đến khi tải lại trang.", "error");
    }
  }
}

export function applyBrand(settings = db.settings) {
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", settings.primaryColor || "#7552F6");
  root.style.setProperty("--brand-secondary", settings.secondaryColor || "#C94DEB");
}

export function getSession() {
  const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeSession(data) {
  const json = JSON.stringify(data);
  if (localStorage.getItem(SESSION_KEY)) localStorage.setItem(SESSION_KEY, json);
  if (sessionStorage.getItem(SESSION_KEY)) sessionStorage.setItem(SESSION_KEY, json);
}

export function setSession(remember) {
  clearSession();
  const data = {
    email: db.credentials.email,
    name: db.settings.accountName,
    at: Date.now(),
  };
  const target = remember ? localStorage : sessionStorage;
  target.setItem(SESSION_KEY, JSON.stringify(data));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export function login(email, password) {
  return (
    db.credentials.email.toLowerCase() === String(email || "").trim().toLowerCase() &&
    db.credentials.password === password
  );
}

export function getSettings() {
  return db.settings;
}

export function updateSettings(patch) {
  Object.assign(db.settings, patch);
  if (patch.email) db.credentials.email = patch.email;
  persist();
  applyBrand(db.settings);
  return db.settings;
}

export function updateAccount({ name, email, currentPassword, newPassword }) {
  if (newPassword) {
    if (currentPassword !== db.credentials.password) return { ok: false, error: "current" };
    db.credentials.password = newPassword;
  }
  db.settings.accountName = name.trim();
  db.settings.email = email.trim();
  db.credentials.email = email.trim();
  persist();
  const session = getSession();
  if (session) {
    session.name = db.settings.accountName;
    session.email = db.credentials.email;
    writeSession(session);
  }
  return { ok: true };
}

export function getAlbums() {
  return [...db.albums].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getAlbum(id) {
  return db.albums.find((album) => album.id === id) || null;
}

export function getAlbumBySlug(slug) {
  return db.albums.find((album) => album.slug === slug) || null;
}

function uniqueSlug(base, currentId) {
  const root = slugify(base) || "album";
  let candidate = root;
  let count = 2;
  const taken = (slug) => db.albums.some((album) => album.slug === slug && album.id !== currentId);
  while (taken(candidate)) {
    candidate = `${root}-${count}`;
    count += 1;
  }
  return candidate;
}

export function createAlbum(input) {
  const now = new Date().toISOString();
  const album = {
    id: `alb_${Math.random().toString(36).slice(2, 8)}`,
    slug: uniqueSlug(input.name),
    name: input.name.trim(),
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    occasion: input.occasion || "Other",
    shootingDate: input.shootingDate,
    description: input.description.trim(),
    coverId: "",
    coverDataUrl: input.coverDataUrl || "",
    coverSession: Boolean(input.coverSession),
    password: input.password.trim(),
    expiresAt: input.expiresAt || "",
    status: input.status,
    templateId: isTemplateId(input.templateId) ? input.templateId : suggestTemplateId(input.occasion),
    allowDownload: input.allowDownload !== false,
    createdAt: now,
    updatedAt: now,
    photos: [],
  };
  db.albums.unshift(album);
  if (input.coverObjectUrl) setCoverMemory(album.id, input.coverObjectUrl);
  persist();
  return album;
}

export function updateAlbum(id, patch) {
  const album = getAlbum(id);
  if (!album) return null;
  Object.assign(album, patch, { updatedAt: new Date().toISOString() });
  persist();
  return album;
}

export function deleteAlbum(id) {
  const album = getAlbum(id);
  album?.photos.forEach((photo) => {
    if (photo.sessionOnly) forgetUrl(photo.id);
  });
  db.albums = db.albums.filter((item) => item.id !== id);
  persist();
}

export function effectiveStatus(album) {
  if (!album) return "draft";
  if (album.status === "draft" || album.status === "hidden") return album.status;
  if (album.expiresAt && daysUntil(album.expiresAt) < 0) return "expired";
  return album.status || "published";
}

export function isUnlocked(slug) {
  try {
    const list = JSON.parse(sessionStorage.getItem(UNLOCK_KEY) || "[]");
    return list.includes(slug);
  } catch {
    return false;
  }
}

export function unlock(slug) {
  const list = new Set(JSON.parse(sessionStorage.getItem(UNLOCK_KEY) || "[]"));
  list.add(slug);
  sessionStorage.setItem(UNLOCK_KEY, JSON.stringify([...list]));
}

export function galleryAccess(album) {
  const admin = Boolean(getSession());
  if (!album) return { state: "invalid", admin };
  const status = effectiveStatus(album);
  if (!admin) {
    if (status === "expired") return { state: "expired", admin, album, status };
    if (status === "hidden") return { state: "hidden", admin, album, status };
    if (status === "draft") return { state: "unpublished", admin, album, status };
    if (album.password && !isUnlocked(album.slug)) return { state: "password", admin, album, status };
  }
  return { state: "ok", admin, album, status };
}

export function albumUrl(album) {
  return `${location.origin}/gallery/${album.slug}`;
}

export function extendExpiration(id, days = 30) {
  const album = getAlbum(id);
  if (!album) return null;
  const base = album.expiresAt && daysUntil(album.expiresAt) >= 0 ? parseISODate(album.expiresAt) : new Date();
  base.setDate(base.getDate() + days);
  album.expiresAt = toISODate(base);
  album.updatedAt = new Date().toISOString();
  persist();
  return album;
}

function photoId() {
  return `up_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

export async function addPhotos(albumId, files, onItem) {
  const album = getAlbum(albumId);
  if (!album) return;
  for (const file of [...files]) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const typeOk = !file.type || ACCEPTED_TYPES.has(file.type);
    if (!ACCEPTED_EXT.has(ext) || !typeOk || file.size <= 0) {
      onItem?.({ file, status: "failed", error: "Chỉ chấp nhận tệp JPG, PNG hoặc WEBP." });
      continue;
    }
    onItem?.({ file, status: "uploading", progress: 0.05 });
    try {
      const url = await readFileWithProgress(file, (progress) => {
        onItem?.({ file, status: "uploading", progress });
      });
      const size = await measureImage(url);
      const photo = {
        id: photoId(),
        name: file.name,
        sessionOnly: true,
        w: size?.w || 4,
        h: size?.h || 3,
        fp: "center",
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };
      rememberUrl(photo.id, url);
      album.photos.push(photo);
      if (!album.coverId && !album.coverDataUrl && !album.coverSession) album.coverId = photo.id;
      album.updatedAt = new Date().toISOString();
      persist();
      onItem?.({ file, status: "success", progress: 1, photoId: photo.id });
    } catch {
      onItem?.({ file, status: "failed", error: "Không đọc được tệp này." });
    }
  }
}

export function deletePhotos(albumId, ids) {
  const album = getAlbum(albumId);
  if (!album) return;
  const remove = new Set(ids);
  album.photos.forEach((photo) => {
    if (remove.has(photo.id) && photo.sessionOnly) forgetUrl(photo.id);
  });
  album.photos = album.photos.filter((photo) => !remove.has(photo.id));
  if (remove.has(album.coverId)) album.coverId = album.photos[0]?.id || "";
  album.updatedAt = new Date().toISOString();
  persist();
}

export function reorderPhotos(albumId, orderedIds) {
  const album = getAlbum(albumId);
  if (!album) return;
  const map = new Map(album.photos.map((photo) => [photo.id, photo]));
  const next = orderedIds.map((id) => map.get(id)).filter(Boolean);
  const leftovers = album.photos.filter((photo) => !orderedIds.includes(photo.id));
  album.photos = next.concat(leftovers);
  album.updatedAt = new Date().toISOString();
  persist();
}

export function movePhoto(albumId, photoId, delta) {
  const album = getAlbum(albumId);
  if (!album) return;
  const index = album.photos.findIndex((photo) => photo.id === photoId);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= album.photos.length) return;
  const [item] = album.photos.splice(index, 1);
  album.photos.splice(target, 0, item);
  album.updatedAt = new Date().toISOString();
  persist();
}

export function sortPhotos(albumId, mode) {
  const album = getAlbum(albumId);
  if (!album || mode === "manual") return;
  const list = [...album.photos];
  if (mode === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  if (mode === "newest") list.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  if (mode === "oldest") list.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
  if (mode === "size") list.sort((a, b) => b.size - a.size);
  album.photos = list;
  album.updatedAt = new Date().toISOString();
  persist();
}

// Only the presentation changes: photos, details and the share slug stay as they are.
export function setAlbumTemplate(albumId, templateId) {
  const album = getAlbum(albumId);
  if (!album || !isTemplateId(templateId)) return null;
  album.templateId = templateId;
  album.updatedAt = new Date().toISOString();
  persist();
  return album;
}

export function setCover(albumId, photoId) {
  const album = getAlbum(albumId);
  if (!album) return;
  album.coverId = photoId;
  album.coverDataUrl = "";
  album.coverSession = false;
  album.updatedAt = new Date().toISOString();
  persist();
}

export function storageStats() {
  const rows = db.albums
    .map((album) => ({
      album,
      photos: album.photos.length,
      bytes: album.photos.reduce((sum, photo) => sum + (photo.size || 0), 0),
    }))
    .sort((a, b) => b.bytes - a.bytes);
  const used = rows.reduce((sum, row) => sum + row.bytes, 0);
  return {
    rows,
    used,
    quota: STORAGE_QUOTA,
    available: Math.max(0, STORAGE_QUOTA - used),
    ratio: STORAGE_QUOTA ? used / STORAGE_QUOTA : 0,
  };
}

export function getMonthlyStats(months = 8) {
  const now = new Date();
  const series = [];
  for (let index = months - 1; index >= 0; index -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - index + 1, 1);
    let albums = 0;
    let bytes = 0;
    let photos = 0;
    db.albums.forEach((album) => {
      const created = new Date(album.createdAt);
      if (created >= start && created < end) albums += 1;
      album.photos.forEach((photo) => {
        const uploaded = new Date(photo.uploadedAt);
        if (uploaded >= start && uploaded < end) {
          bytes += photo.size || 0;
          photos += 1;
        }
      });
    });
    series.push({
      label: `T${start.getMonth() + 1}`,
      albums,
      bytes,
      photos,
    });
  }
  return series;
}

export function getOverview() {
  const albums = db.albums.length;
  const photos = db.albums.reduce((sum, album) => sum + album.photos.length, 0);
  const published = db.albums.filter((album) => effectiveStatus(album) === "published").length;
  const monthly = getMonthlyStats(2);
  return {
    albums,
    photos,
    published,
    storage: storageStats(),
    current: monthly[1],
    previous: monthly[0],
  };
}

export function getExpiring(within = 14) {
  return db.albums
    .map((album) => ({
      album,
      status: effectiveStatus(album),
      days: album.expiresAt ? daysUntil(album.expiresAt) : null,
    }))
    .filter((item) => item.status === "published" && item.days != null && item.days >= 0 && item.days <= within)
    .sort((a, b) => a.days - b.days);
}

export function getNotifications() {
  const items = [];
  getExpiring().forEach((item) => {
    items.push({
      id: `exp-${item.album.id}`,
      title: `${item.album.name} ${item.days === 0 ? "hết hạn hôm nay" : `sẽ hết hạn sau ${item.days} ngày`}`,
      meta: "Thời hạn truy cập",
      href: `/admin/albums/${item.album.id}/share`,
    });
  });
  const storage = storageStats();
  if (storage.ratio >= 0.8) {
    items.push({
      id: "storage-warning",
      title: `Dung lượng đã dùng ${Math.round(storage.ratio * 100)}%`,
      meta: "Gói của studio",
      href: "/admin/storage",
    });
  }
  const latest = getAlbums()[0];
  if (latest) {
    items.push({
      id: `new-${latest.id}`,
      title: `${latest.name} đã có trong thư viện`,
      meta: "Album gần đây",
      href: `/admin/albums/${latest.id}/photos`,
    });
  }
  return items;
}

export function isNotificationRead(id) {
  return (db.notificationsRead || []).includes(id);
}

export function markNotificationRead(id) {
  if (!db.notificationsRead.includes(id)) {
    db.notificationsRead.push(id);
    persist();
  }
}

export function markAllNotificationsRead(ids) {
  db.notificationsRead = [...new Set([...(db.notificationsRead || []), ...ids])];
  persist();
}

export function resetDemo() {
  clearMemory();
  const fresh = createSeed();
  db.albums = fresh.albums;
  db.settings = fresh.settings;
  db.credentials = fresh.credentials;
  db.notificationsRead = [];
  persist();
  applyBrand(db.settings);
}

export function stageCover(albumId, url) {
  setCoverMemory(albumId, url);
}

export function stagedCover(albumId) {
  return getCoverMemory(albumId);
}
