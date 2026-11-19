import { createSeed, SEED_STUDIO_ID, SEED_TEMPLATES, studioSettings } from "./mock.js";
import { DEFAULT_PLAN_ID, getPlanById, PLANS } from "./plans.js";
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
import { daysUntil, formatBytes, parseISODate, slugify, toISODate } from "../utils/format.js";
import { toast } from "../components/toast.js";

// Every studio is a tenant. Albums, members and settings always belong to one studio,
// and every studio-facing read below is scoped to the studio in the current session.
const KEY = "picora.db.v3";
const LEGACY_KEY = "view.db.v1";
const SESSION_KEY = "picora.session";
const UNLOCK_KEY = "picora.unlocked";
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ACCEPTED_EXT = new Set(["jpg", "jpeg", "png", "webp"]);
const VERSION = 3;

export const ROLES = { owner: "Chủ studio", staff: "Nhân viên" };
const RESERVED_SLUGS = new Set(["admin", "api", "app", "gallery", "login", "platform", "s", "signup", "templates", "www", "picora"]);

let db = load() || createSeed();
persist();
applyBrand(getSettings());

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === VERSION && Array.isArray(parsed.studios)) return parsed;
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (parsed && Array.isArray(parsed.albums)) {
        localStorage.removeItem(LEGACY_KEY);
        return migrateLegacy(parsed);
      }
    }
  } catch {
    return null;
  }
  return null;
}

// Single-studio data (v1/v2) becomes the first demo studio. Albums, photos, templates
// and brand settings carry over; accounts come from the multi-studio seed.
function migrateLegacy(old) {
  const seed = createSeed();
  const albums = old.albums.map((album) => ({
    ...album,
    studioId: SEED_STUDIO_ID,
    templateId: isTemplateId(album.templateId) ? album.templateId : SEED_TEMPLATES[album.id] || suggestTemplateId(album.occasion),
    allowDownload: typeof album.allowDownload === "boolean" ? album.allowDownload : true,
  }));
  seed.albums = seed.albums.filter((album) => album.studioId !== SEED_STUDIO_ID).concat(albums);
  const studio = seed.studios.find((item) => item.id === SEED_STUDIO_ID);
  const settings = old.settings || {};
  studio.settings = studioSettings({
    defaultExpirationDays: settings.defaultExpirationDays ?? 90,
    defaultPasswordProtection: Boolean(settings.defaultPasswordProtection),
    slogan: settings.slogan && settings.slogan !== "Your Moments, One Place." ? settings.slogan : undefined,
    primaryColor: settings.primaryColor || undefined,
    secondaryColor: settings.secondaryColor || undefined,
    logoDataUrl: settings.logoDataUrl || "",
  });
  Object.keys(studio.settings).forEach((key) => studio.settings[key] === undefined && delete studio.settings[key]);
  studio.settings = studioSettings(studio.settings);
  return seed;
}

function persist() {
  db.version = VERSION;
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    db.albums.forEach((album) => {
      if (album.coverDataUrl && album.coverDataUrl.length > 180000) album.coverDataUrl = "";
    });
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
      toast("Ảnh bìa quá lớn nên sẽ không được giữ sau khi tải lại trang.", "info");
    } catch {
      toast("Trình duyệt đã chặn lưu cục bộ. Thay đổi chỉ giữ đến khi tải lại trang.", "error");
    }
  }
}

export function applyBrand(settings) {
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", settings?.primaryColor || "#7552F6");
  root.style.setProperty("--brand-secondary", settings?.secondaryColor || "#C94DEB");
}

function newId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

/* ---------- Session ---------- */

function readSession() {
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

// A session is only valid while its user exists and still belongs to its studio.
export function getSession() {
  const data = readSession();
  if (!data?.userId) return null;
  const user = db.users.find((item) => item.id === data.userId);
  if (!user) return null;
  if (data.studioId) {
    const member = membership(user.id, data.studioId);
    if (!member) return null;
    return { ...data, user, role: member.role, name: user.name, email: user.email };
  }
  if (!user.platformAdmin) return null;
  return { ...data, user, role: "platform", name: user.name, email: user.email };
}

export function setSession({ userId, studioId = null }, remember = true) {
  clearSession();
  const target = remember ? localStorage : sessionStorage;
  target.setItem(SESSION_KEY, JSON.stringify({ userId, studioId, at: Date.now() }));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export function login(email, password) {
  const needle = String(email || "").trim().toLowerCase();
  return db.users.find((user) => user.email.toLowerCase() === needle && user.password === password) || null;
}

function membership(userId, studioId) {
  return db.memberships.find((item) => item.userId === userId && item.studioId === studioId) || null;
}

export function studiosForUser(userId) {
  return db.memberships
    .filter((item) => item.userId === userId)
    .map((item) => ({ studio: getStudio(item.studioId), role: item.role }))
    .filter((item) => item.studio);
}

// Where a user lands after signing in: their first active studio, or the platform console.
export function landingFor(user) {
  const studios = studiosForUser(user.id);
  const active = studios.find((item) => item.studio.status === "active");
  if (active) return { studioId: active.studio.id };
  if (user.platformAdmin) return { studioId: null };
  if (studios.length) return { studioId: studios[0].studio.id, suspended: true };
  return null;
}

export function switchStudio(studioId) {
  const session = getSession();
  if (!session || !membership(session.user.id, studioId)) return false;
  writeSession({ userId: session.user.id, studioId, at: Date.now() });
  applyBrand(getStudio(studioId)?.settings);
  return true;
}

export function currentUser() {
  return getSession()?.user || null;
}

export function currentStudio() {
  const session = getSession();
  return session?.studioId ? getStudio(session.studioId) : null;
}

function currentStudioId() {
  return getSession()?.studioId || "";
}

export function isOwner() {
  return getSession()?.role === "owner";
}

const OWNER_ONLY = { ok: false, error: "Chỉ chủ studio mới thực hiện được thao tác này." };

/* ---------- Studios ---------- */

export function getStudio(id) {
  return db.studios.find((studio) => studio.id === id) || null;
}

export function getStudioBySlug(slug) {
  return db.studios.find((studio) => studio.slug === slug) || null;
}

export function studioSlugError(slug, currentId) {
  if (!slug) return "Vui lòng nhập địa chỉ studio.";
  if (slug.length < 3) return "Địa chỉ studio cần ít nhất 3 ký tự.";
  if (RESERVED_SLUGS.has(slug)) return "Địa chỉ này đã được hệ thống sử dụng.";
  if (db.studios.some((studio) => studio.slug === slug && studio.id !== currentId)) return "Địa chỉ này đã có studio khác sử dụng.";
  return "";
}

export function registerStudio({ name, email, password, studioName, studioSlug }) {
  const errors = {};
  const cleanEmail = String(email || "").trim();
  const slug = slugify(studioSlug || studioName);
  if (!name.trim()) errors.ownerName = "Vui lòng nhập họ và tên.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) errors.email = "Vui lòng nhập email hợp lệ.";
  else if (db.users.some((user) => user.email.toLowerCase() === cleanEmail.toLowerCase())) errors.email = "Email này đã được đăng ký.";
  if (String(password || "").length < 6) errors.password = "Mật khẩu cần ít nhất 6 ký tự.";
  if (!studioName.trim()) errors.studioName = "Vui lòng nhập tên studio.";
  const slugError = studioSlugError(slug);
  if (slugError) errors.studioSlug = slugError;
  if (Object.keys(errors).length) return { ok: false, errors };

  const now = new Date().toISOString();
  const user = { id: newId("usr"), name: name.trim(), email: cleanEmail, password };
  const studio = {
    id: newId("std"),
    slug,
    name: studioName.trim(),
    planId: DEFAULT_PLAN_ID,
    status: "active",
    createdAt: now,
    settings: studioSettings(),
  };
  db.users.push(user);
  db.studios.push(studio);
  db.memberships.push({ userId: user.id, studioId: studio.id, role: "owner", createdAt: now });
  persist();
  return { ok: true, user, studio };
}

// Platform console: an existing account becomes owner as-is; a new email needs a name and temporary password.
export function createStudio({ studioName, studioSlug, planId, ownerName, ownerEmail, ownerPassword }) {
  if (!currentUser()?.platformAdmin) return { ok: false, errors: { studioName: "Chỉ quản trị nền tảng mới tạo được studio." } };
  const errors = {};
  const cleanEmail = String(ownerEmail || "").trim();
  const slug = slugify(studioSlug || studioName);
  const plan = PLANS.find((item) => item.id === planId) || getPlanById(DEFAULT_PLAN_ID);
  if (!String(studioName || "").trim()) errors.studioName = "Vui lòng nhập tên studio.";
  const slugError = studioSlugError(slug);
  if (slugError) errors.studioSlug = slugError;
  let owner = null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) errors.ownerEmail = "Vui lòng nhập email hợp lệ.";
  else owner = db.users.find((user) => user.email.toLowerCase() === cleanEmail.toLowerCase()) || null;
  if (!owner) {
    if (!String(ownerName || "").trim()) errors.ownerName = "Vui lòng nhập họ và tên chủ studio.";
    if (String(ownerPassword || "").length < 6) errors.ownerPassword = "Mật khẩu tạm cần ít nhất 6 ký tự.";
  }
  if (Object.keys(errors).length) return { ok: false, errors };

  const now = new Date().toISOString();
  const existing = Boolean(owner);
  if (!owner) {
    owner = { id: newId("usr"), name: ownerName.trim(), email: cleanEmail, password: ownerPassword };
    db.users.push(owner);
  }
  const studio = {
    id: newId("std"),
    slug,
    name: studioName.trim(),
    planId: plan.id,
    status: "active",
    createdAt: now,
    settings: studioSettings(),
  };
  db.studios.push(studio);
  db.memberships.push({ userId: owner.id, studioId: studio.id, role: "owner", createdAt: now });
  persist();
  return { ok: true, studio, owner, existing };
}

export function updateStudio(patch) {
  const studio = currentStudio();
  if (!studio) return { ok: false, error: "Không tìm thấy studio." };
  if (!isOwner()) return OWNER_ONLY;
  if (patch.slug !== undefined) {
    const slug = slugify(patch.slug);
    const error = studioSlugError(slug, studio.id);
    if (error) return { ok: false, error };
    studio.slug = slug;
  }
  if (patch.name !== undefined) studio.name = patch.name.trim();
  persist();
  return { ok: true, studio };
}

export function getSettings() {
  return currentStudio()?.settings || studioSettings();
}

export function updateSettings(patch) {
  const studio = currentStudio();
  if (!studio || !isOwner()) return null;
  Object.assign(studio.settings, patch);
  persist();
  applyBrand(studio.settings);
  return studio.settings;
}

export function updateAccount({ name, email, currentPassword, newPassword }) {
  const user = currentUser();
  if (!user) return { ok: false, error: "session" };
  const cleanEmail = email.trim();
  if (db.users.some((item) => item.id !== user.id && item.email.toLowerCase() === cleanEmail.toLowerCase())) {
    return { ok: false, error: "email" };
  }
  if (newPassword) {
    if (currentPassword !== user.password) return { ok: false, error: "current" };
    user.password = newPassword;
  }
  user.name = name.trim();
  user.email = cleanEmail;
  persist();
  return { ok: true };
}

/* ---------- Plans & limits ---------- */

export function getPlan(studio = currentStudio()) {
  return getPlanById(studio?.planId);
}

export function studioUsage(studioId = currentStudioId()) {
  const albums = db.albums.filter((album) => album.studioId === studioId);
  return {
    albums: albums.length,
    photos: albums.reduce((sum, album) => sum + album.photos.length, 0),
    storage: albums.reduce((sum, album) => sum + album.photos.reduce((total, photo) => total + (photo.size || 0), 0), 0),
    members: db.memberships.filter((item) => item.studioId === studioId).length,
  };
}

// Returns the first limit a studio would break on the given plan, or "".
function planConflict(studioId, plan) {
  const usage = studioUsage(studioId);
  if (usage.storage > plan.storage) return `Studio đang dùng ${formatBytes(usage.storage)}, vượt dung lượng ${formatBytes(plan.storage)} của gói ${plan.name}.`;
  if (plan.albums != null && usage.albums > plan.albums) return `Studio đang có ${usage.albums} album, vượt giới hạn ${plan.albums} album của gói ${plan.name}.`;
  if (usage.members > plan.members) return `Studio đang có ${usage.members} thành viên, vượt giới hạn ${plan.members} của gói ${plan.name}.`;
  return "";
}

export function changePlan(planId) {
  const studio = currentStudio();
  const plan = PLANS.find((item) => item.id === planId);
  if (!studio || !plan) return { ok: false, error: "Gói không hợp lệ." };
  if (!isOwner()) return OWNER_ONLY;
  const conflict = planConflict(studio.id, plan);
  if (conflict) return { ok: false, error: conflict };
  studio.planId = plan.id;
  persist();
  return { ok: true, plan };
}

export function albumLimit() {
  const plan = getPlan();
  const usage = studioUsage();
  if (plan.albums != null && usage.albums >= plan.albums) {
    return { ok: false, error: `Gói ${plan.name} cho phép tối đa ${plan.albums} album. Nâng cấp gói để tạo thêm.` };
  }
  return { ok: true };
}

/* ---------- Members ---------- */

export function getMembers() {
  const studioId = currentStudioId();
  return db.memberships
    .filter((item) => item.studioId === studioId)
    .map((item) => ({ ...item, user: db.users.find((user) => user.id === item.userId) }))
    .filter((item) => item.user)
    .sort((a, b) => (a.role === b.role ? a.user.name.localeCompare(b.user.name) : a.role === "owner" ? -1 : 1));
}

export function addMember({ name, email, role, password }) {
  const studio = currentStudio();
  if (!studio) return { ok: false, error: "Không tìm thấy studio." };
  if (!isOwner()) return OWNER_ONLY;
  const plan = getPlan(studio);
  if (studioUsage(studio.id).members >= plan.members) {
    return { ok: false, error: `Gói ${plan.name} cho phép tối đa ${plan.members} thành viên.` };
  }
  const cleanEmail = String(email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { ok: false, error: "Vui lòng nhập email hợp lệ." };
  let user = db.users.find((item) => item.email.toLowerCase() === cleanEmail.toLowerCase());
  if (user && membership(user.id, studio.id)) return { ok: false, error: "Người này đã là thành viên của studio." };
  const existing = Boolean(user);
  if (!user) {
    if (!name.trim()) return { ok: false, error: "Vui lòng nhập họ và tên." };
    if (String(password || "").length < 6) return { ok: false, error: "Mật khẩu tạm cần ít nhất 6 ký tự." };
    user = { id: newId("usr"), name: name.trim(), email: cleanEmail, password };
    db.users.push(user);
  }
  db.memberships.push({ userId: user.id, studioId: studio.id, role: ROLES[role] ? role : "staff", createdAt: new Date().toISOString() });
  persist();
  return { ok: true, user, existing };
}

function ownerCount(studioId) {
  return db.memberships.filter((item) => item.studioId === studioId && item.role === "owner").length;
}

export function setMemberRole(userId, role) {
  const studioId = currentStudioId();
  const member = membership(userId, studioId);
  if (!isOwner()) return OWNER_ONLY;
  if (!member || !ROLES[role]) return { ok: false, error: "Không tìm thấy thành viên." };
  if (member.role === "owner" && role !== "owner" && ownerCount(studioId) <= 1) {
    return { ok: false, error: "Studio cần ít nhất một chủ studio." };
  }
  member.role = role;
  persist();
  return { ok: true };
}

export function removeMember(userId) {
  const studioId = currentStudioId();
  const member = membership(userId, studioId);
  if (!isOwner()) return OWNER_ONLY;
  if (!member) return { ok: false, error: "Không tìm thấy thành viên." };
  if (userId === currentUser()?.id) return { ok: false, error: "Bạn không thể tự xóa mình khỏi studio." };
  if (member.role === "owner" && ownerCount(studioId) <= 1) return { ok: false, error: "Studio cần ít nhất một chủ studio." };
  db.memberships = db.memberships.filter((item) => item !== member);
  persist();
  return { ok: true };
}

/* ---------- Albums (scoped to the current studio) ---------- */

function studioAlbums(studioId = currentStudioId()) {
  return db.albums.filter((album) => album.studioId === studioId);
}

export function getAlbums() {
  return [...studioAlbums()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getAlbum(id) {
  const studioId = currentStudioId();
  return db.albums.find((album) => album.id === id && album.studioId === studioId) || null;
}

export function getPublicAlbum(studioSlug, albumSlug) {
  const studio = getStudioBySlug(studioSlug);
  if (!studio) return { studio: null, album: null };
  const album = db.albums.find((item) => item.studioId === studio.id && item.slug === albumSlug) || null;
  return { studio, album };
}

// Links from before studios existed were /gallery/:slug.
export function findLegacyAlbum(slug) {
  const album = db.albums.find((item) => item.slug === slug);
  return album ? { album, studio: getStudio(album.studioId) } : null;
}

function uniqueSlug(base, studioId, currentId) {
  const root = slugify(base) || "album";
  let candidate = root;
  let count = 2;
  const taken = (slug) => db.albums.some((album) => album.studioId === studioId && album.slug === slug && album.id !== currentId);
  while (taken(candidate)) {
    candidate = `${root}-${count}`;
    count += 1;
  }
  return candidate;
}

export function createAlbum(input) {
  const studioId = currentStudioId();
  if (!studioId || !albumLimit().ok) return null;
  const now = new Date().toISOString();
  const album = {
    id: newId("alb"),
    studioId,
    slug: uniqueSlug(input.name, studioId),
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
  const { studioId, id: _id, ...safe } = patch;
  Object.assign(album, safe, { updatedAt: new Date().toISOString() });
  persist();
  return album;
}

export function deleteAlbum(id) {
  const album = getAlbum(id);
  if (!album) return;
  album.photos.forEach((photo) => {
    if (photo.sessionOnly) forgetUrl(photo.id);
  });
  db.albums = db.albums.filter((item) => item !== album);
  persist();
}

export function effectiveStatus(album) {
  if (!album) return "draft";
  if (album.status === "draft" || album.status === "hidden") return album.status;
  if (album.expiresAt && daysUntil(album.expiresAt) < 0) return "expired";
  return album.status || "published";
}

function unlockKey(album) {
  return `${album.studioId}/${album.slug}`;
}

export function isUnlocked(album) {
  try {
    return JSON.parse(sessionStorage.getItem(UNLOCK_KEY) || "[]").includes(unlockKey(album));
  } catch {
    return false;
  }
}

export function unlock(album) {
  const list = new Set(JSON.parse(sessionStorage.getItem(UNLOCK_KEY) || "[]"));
  list.add(unlockKey(album));
  sessionStorage.setItem(UNLOCK_KEY, JSON.stringify([...list]));
}

// Only members of the album's own studio get the studio preview; everyone else is a client.
export function galleryAccess(album, studio) {
  const session = getSession();
  const admin = Boolean(session && album && session.studioId === album.studioId);
  if (!album || !studio) return { state: "invalid", admin: false };
  const status = effectiveStatus(album);
  if (!admin) {
    if (studio.status !== "active") return { state: "suspended", admin, album, status };
    if (status === "expired") return { state: "expired", admin, album, status };
    if (status === "hidden") return { state: "hidden", admin, album, status };
    if (status === "draft") return { state: "unpublished", admin, album, status };
    if (album.password && !isUnlocked(album)) return { state: "password", admin, album, status };
  }
  return { state: "ok", admin, album, status };
}

export function galleryPath(album) {
  const studio = getStudio(album.studioId);
  return `/s/${studio?.slug || "studio"}/${album.slug}`;
}

export function albumUrl(album) {
  return `${location.origin}${galleryPath(album)}`;
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
    const stats = storageStats();
    if (stats.used + file.size > stats.quota) {
      onItem?.({ file, status: "failed", error: `Vượt dung lượng gói ${getPlan().name}` });
      continue;
    }
    onItem?.({ file, status: "uploading", progress: 0.05 });
    try {
      const url = await readFileWithProgress(file, (progress) => {
        onItem?.({ file, status: "uploading", progress });
      });
      const size = await measureImage(url);
      const photo = {
        id: newId("up"),
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

/* ---------- Studio statistics ---------- */

export function storageStats() {
  const quota = getPlan().storage;
  const rows = studioAlbums()
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
    quota,
    available: Math.max(0, quota - used),
    ratio: quota ? used / quota : 0,
  };
}

export function getMonthlyStats(months = 8) {
  const albums = studioAlbums();
  const now = new Date();
  const series = [];
  for (let index = months - 1; index >= 0; index -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - index + 1, 1);
    let count = 0;
    let bytes = 0;
    let photos = 0;
    albums.forEach((album) => {
      const created = new Date(album.createdAt);
      if (created >= start && created < end) count += 1;
      album.photos.forEach((photo) => {
        const uploaded = new Date(photo.uploadedAt);
        if (uploaded >= start && uploaded < end) {
          bytes += photo.size || 0;
          photos += 1;
        }
      });
    });
    series.push({ label: `T${start.getMonth() + 1}`, albums: count, bytes, photos });
  }
  return series;
}

export function getOverview() {
  const albums = studioAlbums();
  const monthly = getMonthlyStats(2);
  return {
    albums: albums.length,
    photos: albums.reduce((sum, album) => sum + album.photos.length, 0),
    published: albums.filter((album) => effectiveStatus(album) === "published").length,
    storage: storageStats(),
    current: monthly[1],
    previous: monthly[0],
  };
}

export function getExpiring(within = 14) {
  return studioAlbums()
    .map((album) => ({
      album,
      status: effectiveStatus(album),
      days: album.expiresAt ? daysUntil(album.expiresAt) : null,
    }))
    .filter((item) => item.status === "published" && item.days != null && item.days >= 0 && item.days <= within)
    .sort((a, b) => a.days - b.days);
}

export function getNotifications() {
  const studioId = currentStudioId();
  const items = [];
  getExpiring().forEach((item) => {
    items.push({
      id: `${studioId}:exp-${item.album.id}`,
      title: `${item.album.name} ${item.days === 0 ? "hết hạn hôm nay" : `sẽ hết hạn sau ${item.days} ngày`}`,
      meta: "Thời hạn truy cập",
      href: `/admin/albums/${item.album.id}/share`,
    });
  });
  const storage = storageStats();
  if (storage.ratio >= 0.8) {
    items.push({
      id: `${studioId}:storage-warning`,
      title: `Dung lượng đã dùng ${Math.round(storage.ratio * 100)}%`,
      meta: `Gói ${getPlan().name}`,
      href: "/admin/storage",
    });
  }
  const latest = getAlbums()[0];
  if (latest) {
    items.push({
      id: `${studioId}:new-${latest.id}`,
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

/* ---------- Platform console ---------- */

export function listStudios() {
  return db.studios
    .map((studio) => {
      const owner = db.memberships.find((item) => item.studioId === studio.id && item.role === "owner");
      return {
        studio,
        plan: getPlanById(studio.planId),
        usage: studioUsage(studio.id),
        owner: owner ? db.users.find((user) => user.id === owner.userId) : null,
      };
    })
    .sort((a, b) => new Date(b.studio.createdAt) - new Date(a.studio.createdAt));
}

export function setStudioStatus(studioId, status) {
  const studio = getStudio(studioId);
  if (!studio || !["active", "suspended"].includes(status)) return null;
  studio.status = status;
  persist();
  return studio;
}

// The platform may move a studio to any plan; usage over the new limit only blocks new uploads.
export function setStudioPlan(studioId, planId) {
  const studio = getStudio(studioId);
  const plan = PLANS.find((item) => item.id === planId);
  if (!studio || !plan) return { ok: false };
  studio.planId = plan.id;
  persist();
  return { ok: true, warning: planConflict(studio.id, plan) };
}

export function resetDemo() {
  clearMemory();
  db = createSeed();
  persist();
  applyBrand(getSettings());
}

export function stageCover(albumId, url) {
  setCoverMemory(albumId, url);
}

export function stagedCover(albumId) {
  return getCoverMemory(albumId);
}
