import { api, ApiError, errorMessage, uploadFile, withRetry } from "./api";
import { daysUntilPlanExpiry, formatVNDate, isPlanExpired, isPlanExpiringSoon } from "./billing";
import { studioSettings } from "./mock";
import { getPlanById } from "./plans";
import { isTemplateId } from "./catalog";
import { makeVariants, squareJpeg } from "./media";
import { daysUntil, parseISODate, toISODate } from "./format";
import { toast } from "./overlay";
import type {
  Album,
  AlbumSelection,
  AlbumStatus,
  EffectiveStatus,
  FormOutcome,
  Membership,
  Outcome,
  PaymentKind,
  PaymentRequest,
  Photo,
  Plan,
  PlatformBank,
  PlatformPaymentRequest,
  Role,
  Session,
  Studio,
  StudioSettings,
  StudioStatus,
  User,
} from "./types";

// Every studio is a tenant. The API only ever returns the signed-in account, its studios,
// and the current studio's members and albums; reads below come from that local copy.
const READ_KEY = "picora.notifications.read";
const TOKEN_KEY = "picora.album-tokens";
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ACCEPTED_EXT = new Set(["jpg", "jpeg", "png", "webp"]);

export const ROLES: Record<Role, string> = { owner: "Chủ studio", staff: "Nhân viên" };

/* ---------- Change notifications (React subscribes through useStore) ---------- */

let version = 0;
const listeners = new Set<() => void>();

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getVersion() {
  return version;
}

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

/* ---------- Local copy of the server state ---------- */

export interface Member extends Membership {
  user: User;
}

interface StoredSession {
  userId: string;
  studioId: string | null;
  role: Role | "platform";
}

interface Bootstrap {
  session: StoredSession | null;
  user?: User;
  studios?: Array<{ studio: Studio; role: Role }>;
  members?: Member[];
  albums?: Album[];
  pendingPayment?: PaymentRequest | null;
}

interface State {
  session: (StoredSession & { at: number }) | null;
  user: User | null;
  studios: Array<{ studio: Studio; role: Role }>;
  members: Member[];
  albums: Album[];
  pendingPayment: PaymentRequest | null;
}

const EMPTY: State = { session: null, user: null, studios: [], members: [], albums: [], pendingPayment: null };
let state: State = EMPTY;

export async function hydrate(): Promise<void> {
  try {
    const data = await api<Bootstrap>("/bootstrap");
    state = data.session
      ? {
          session: { ...data.session, at: Date.now() },
          user: data.user || null,
          studios: data.studios || [],
          members: data.members || [],
          albums: data.albums || [],
          pendingPayment: data.pendingPayment || null,
        }
      : EMPTY;
    studioBilling = null;
  } catch (error) {
    state = EMPTY;
    studioBilling = null;
    toast(errorMessage(error, "Không tải được dữ liệu từ máy chủ."), "error");
  }
  emit();
}

// Optimistic writes: the local copy changes at once and requests go out one at a time,
// in order. If the server refuses one, the local copy is reloaded from the server.
let queue: Promise<unknown> = Promise.resolve();

function sync(task: () => Promise<unknown>) {
  queue = queue.then(task).catch((error) => {
    toast(errorMessage(error, "Không lưu được thay đổi. Dữ liệu đã được tải lại."), "error");
    return hydrate();
  });
}

const now = () => new Date().toISOString();

export function applyBrand(settings?: Partial<StudioSettings> | null) {
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", settings?.primaryColor || "#7552F6");
  root.style.setProperty("--brand-secondary", settings?.secondaryColor || "#C94DEB");
}

/* ---------- Session ---------- */

export function getSession(): Session | null {
  const { session, user } = state;
  if (!session || !user) return null;
  return { ...session, user, name: user.name, email: user.email };
}

export async function login(email: string, password: string, remember = true): Promise<Outcome<{ studioId: string | null }>> {
  try {
    const result = await api<{ studioId: string | null }>("/auth/login", { body: { email: email.trim(), password, remember } });
    await hydrate();
    return { ok: true, studioId: result.studioId };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export function clearSession() {
  state = EMPTY;
  platformRows = null;
  galleries.clear();
  emit();
  void api("/auth/logout", { body: {} }).catch(() => {});
}

export function studiosForUser(_userId?: string): Array<{ studio: Studio; role: Role }> {
  return state.studios;
}

export async function enterPlatform(): Promise<Outcome> {
  try {
    await api("/session/studio", { body: { studioId: null } });
    await hydrate();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function switchStudio(studioId: string): Promise<Outcome> {
  try {
    await api("/session/studio", { body: { studioId } });
    await hydrate();
    applyBrand(currentStudio()?.settings);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export function currentUser(): User | null {
  return state.user;
}

export function currentStudio(): Studio | null {
  const id = state.session?.studioId;
  return id ? state.studios.find((item) => item.studio.id === id)?.studio || null : null;
}

function currentStudioId(): string {
  return state.session?.studioId || "";
}

export function isOwner(): boolean {
  return state.session?.role === "owner";
}

function replaceStudio(studio: Studio) {
  state.studios = state.studios.map((item) => (item.studio.id === studio.id ? { ...item, studio } : item));
  emit();
}

/* ---------- Studios ---------- */

export function getStudio(id: string): Studio | null {
  return state.studios.find((item) => item.studio.id === id)?.studio || platformRows?.find((row) => row.studio.id === id)?.studio || null;
}

export async function registerStudio(input: {
  name: string;
  email: string;
  password: string;
  studioName: string;
  studioSlug: string;
}): Promise<FormOutcome<{ studioName: string }>> {
  try {
    const result = await api<{ studioName: string }>("/auth/signup", { body: input });
    await hydrate();
    return { ok: true, studioName: result.studioName };
  } catch (error) {
    const errors = (error as { data?: { errors?: Record<string, string> } }).data?.errors;
    return { ok: false, errors: errors || { studioName: errorMessage(error) } };
  }
}

export async function updateStudio(patch: { name?: string; slug?: string }): Promise<Outcome<{ studio: Studio }>> {
  try {
    const { studio } = await api<{ studio: Studio }>("/studio", { method: "PATCH", body: patch });
    replaceStudio(studio);
    return { ok: true, studio };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export function getSettings(): StudioSettings {
  return currentStudio()?.settings || studioSettings();
}

export function updateSettings(patch: Partial<StudioSettings>): StudioSettings | null {
  const studio = currentStudio();
  if (!studio || !isOwner()) return null;
  replaceStudio({ ...studio, settings: { ...studio.settings, ...patch } });
  applyBrand(currentStudio()?.settings);
  sync(() => api("/studio/settings", { method: "PATCH", body: patch }));
  return currentStudio()!.settings;
}

export async function updateAccount(input: { name: string; email: string; currentPassword: string; newPassword: string }): Promise<Outcome> {
  try {
    const { user } = await api<{ user: User }>("/account", { method: "PATCH", body: input });
    setUser(user);
    return { ok: true };
  } catch (error) {
    const code = (error as { data?: { code?: string } }).data?.code;
    return { ok: false, error: code === "email" || code === "current" ? code : errorMessage(error) };
  }
}

function setUser(user: User) {
  state.user = user;
  state.members = state.members.map((member) => (member.userId === user.id ? { ...member, user } : member));
  emit();
}

export async function changeAvatar(file: File): Promise<Outcome> {
  const photo = await squareJpeg(file);
  if (!photo) return { ok: false, error: "Không đọc được ảnh này. Hãy chọn ảnh JPG, PNG hoặc WEBP." };
  try {
    const intent = await api<{ key: string; uploadUrl: string }>("/account/avatar/upload", { body: {} });
    await withRetry(() => uploadFile(intent.uploadUrl, photo));
    const { user } = await api<{ user: User }>("/account/avatar", { method: "PUT", body: { key: intent.key } });
    setUser(user);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Chưa đổi được ảnh đại diện. Vui lòng thử lại.") };
  }
}

export async function removeAvatar(): Promise<Outcome> {
  try {
    const { user } = await api<{ user: User }>("/account/avatar", { method: "PUT", body: { key: "" } });
    setUser(user);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

/* ---------- Plans & limits ---------- */

export function getPlan(studio: Studio | null = currentStudio()): Plan {
  return getPlanById(studio?.planId);
}

export interface Usage {
  albums: number;
  photos: number;
  storage: number;
  members: number;
}

export function studioUsage(): Usage {
  const albums = state.albums;
  return {
    albums: albums.length,
    photos: albums.reduce((sum, album) => sum + album.photos.length, 0),
    storage: albums.reduce((sum, album) => sum + album.photos.reduce((total, photo) => total + (photo.size || 0), 0), 0),
    members: state.members.length,
  };
}

export async function changePlan(planId: string): Promise<Outcome<{ plan: Plan }>> {
  try {
    const { studio } = await api<{ studio: Studio }>("/studio/plan", { method: "PUT", body: { planId } });
    replaceStudio(studio);
    return { ok: true, plan: getPlanById(studio.planId) };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export function getPendingPayment(): PaymentRequest | null {
  return state.pendingPayment;
}

let studioBilling: { studioId: string; bank: PlatformBank; requests: PaymentRequest[] } | null = null;

export function getStudioBilling(): { loaded: boolean; bank: PlatformBank | null; requests: PaymentRequest[] } {
  const id = currentStudioId();
  if (!studioBilling || studioBilling.studioId !== id) return { loaded: false, bank: null, requests: [] };
  return { loaded: true, bank: studioBilling.bank, requests: studioBilling.requests };
}

export async function loadStudioBilling(): Promise<void> {
  const id = currentStudioId();
  if (!id) return;
  try {
    const data = await api<{ bank: PlatformBank; requests: PaymentRequest[] }>("/studio/billing");
    studioBilling = { studioId: id, bank: data.bank, requests: data.requests };
    state.pendingPayment = data.requests.find((item) => item.status === "pending") || null;
  } catch (error) {
    toast(errorMessage(error, "Không tải được thông tin thanh toán."), "error");
  }
  emit();
}

export async function submitPaymentRequest(input: {
  file: File;
  targetPlanId: string;
  kind: PaymentKind;
  transferCode: string;
  note: string;
}): Promise<Outcome<{ request: PaymentRequest }>> {
  const ext = input.file.name.split(".").pop()?.toLowerCase() || "";
  if (!ACCEPTED_EXT.has(ext) || (input.file.type && !ACCEPTED_TYPES.has(input.file.type))) {
    return { ok: false, error: "Chỉ chấp nhận ảnh xác nhận JPG, PNG hoặc WEBP." };
  }
  if (input.file.size > 10 * 1024 * 1024) return { ok: false, error: "Ảnh xác nhận vượt quá 10 MB." };
  try {
    const intent = await api<{ paymentId: string; key: string; uploadUrl: string }>("/studio/payments/upload", {
      body: { name: input.file.name, type: input.file.type, size: input.file.size },
    });
    await withRetry(() => uploadFile(intent.uploadUrl, input.file));
    const { request } = await api<{ request: PaymentRequest }>("/studio/payments", {
      body: {
        paymentId: intent.paymentId,
        receiptKey: intent.key,
        targetPlanId: input.targetPlanId,
        kind: input.kind,
        transferCode: input.transferCode,
        note: input.note,
      },
    });
    state.pendingPayment = request;
    if (studioBilling && studioBilling.studioId === currentStudioId()) {
      studioBilling = { ...studioBilling, requests: [request, ...studioBilling.requests] };
    }
    emit();
    return { ok: true, request };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Chưa gửi được ảnh xác nhận. Vui lòng thử lại.") };
  }
}

export async function cancelPaymentRequest(id: string): Promise<Outcome> {
  try {
    await api(`/studio/payments/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (state.pendingPayment?.id === id) state.pendingPayment = null;
    if (studioBilling) {
      studioBilling = { ...studioBilling, requests: studioBilling.requests.filter((item) => item.id !== id) };
    }
    emit();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export function albumLimit(): Outcome {
  const plan = getPlan();
  if (plan.albums != null && state.albums.length >= plan.albums) {
    return { ok: false, error: `Gói ${plan.name} cho phép tối đa ${plan.albums} album. Nâng cấp gói để tạo thêm.` };
  }
  return { ok: true };
}

/* ---------- Members ---------- */

export function getMembers(): Member[] {
  return state.members;
}

async function memberRequest<T extends object>(path: string, method: string, body?: unknown): Promise<Outcome<T>> {
  try {
    const result = await api<T & { members: Member[] }>(path, { method, body });
    state.members = result.members;
    emit();
    return { ok: true, ...result };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export function addMember(input: { name: string; email: string; role: string; password: string }) {
  return memberRequest<{ name: string; existing: boolean }>("/members", "POST", input);
}

export function setMemberRole(userId: string, role: string) {
  return memberRequest(`/members/${encodeURIComponent(userId)}`, "PATCH", { role });
}

export function removeMember(userId: string) {
  return memberRequest(`/members/${encodeURIComponent(userId)}`, "DELETE");
}

/* ---------- Albums (scoped to the current studio) ---------- */

export function getAlbums(): Album[] {
  return [...state.albums].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAlbum(id: string): Album | null {
  return state.albums.find((album) => album.id === id) || null;
}

export interface AlbumInput {
  name: string;
  customerName: string;
  customerPhone: string;
  occasion: string;
  shootingDate: string;
  description: string;
  password: string;
  expiresAt: string;
  status: AlbumStatus;
  allowDownload: boolean;
  templateId: string;
  coverKey?: string;
  selectionEnabled?: boolean;
  selectionLimit?: number;
}

const ALBUM_FIELDS = [
  "selectionEnabled",
  "selectionLimit",
  "selectionLocked",
  "name",
  "customerName",
  "customerPhone",
  "occasion",
  "shootingDate",
  "description",
  "password",
  "expiresAt",
  "status",
  "templateId",
  "allowDownload",
  "coverId",
  "mobileCoverId",
  "coverKey",
] as const;

export async function createAlbum(input: AlbumInput): Promise<Outcome<{ album: Album }>> {
  try {
    const { album } = await api<{ album: Album }>("/albums", { body: input });
    state.albums = [album, ...state.albums];
    emit();
    return { ok: true, album };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Không thể tạo album.") };
  }
}

export type AlbumPatch = Partial<Album> & { coverKey?: string };

export function updateAlbum(id: string, patch: AlbumPatch): Album | null {
  const album = getAlbum(id);
  if (!album) return null;
  const { coverKey, ...local } = patch;
  const { studioId: _studio, id: _id, photos: _photos, selection: _selection, ...safe } = local;
  Object.assign(album, safe, { updatedAt: now() });
  emit();
  const body: Record<string, unknown> = {};
  ALBUM_FIELDS.forEach((key) => {
    if (key === "coverKey") return;
    if (key in patch) body[key] = patch[key as keyof AlbumPatch];
  });
  if (coverKey !== undefined) body.coverKey = coverKey;
  else if (patch.coverDataUrl === "") body.coverKey = "";
  sync(async () => {
    const result = await api<{ album: Album }>(`/albums/${encodeURIComponent(id)}`, { method: "PATCH", body });
    if (coverKey !== undefined) {
      const current = getAlbum(id);
      if (current) {
        current.coverDataUrl = result.album.coverDataUrl;
        emit();
      }
    }
  });
  return album;
}

// Clients submit picks from the public gallery, so the studio view re-reads them on demand.
export async function refreshSelection(id: string): Promise<void> {
  try {
    const result = await api<{ selection: AlbumSelection | null; selectionLocked: boolean }>(`/albums/${encodeURIComponent(id)}/selection`);
    const album = getAlbum(id);
    if (!album) return;
    const changed = album.selection?.submittedAt !== result.selection?.submittedAt || album.selectionLocked !== result.selectionLocked;
    album.selection = result.selection;
    album.selectionLocked = result.selectionLocked;
    if (changed) emit();
  } catch {
    // Keeps showing the copy from bootstrap.
  }
}

export function clearSelection(id: string) {
  const album = getAlbum(id);
  if (!album) return;
  album.selection = null;
  album.selectionLocked = false;
  emit();
  sync(() => api(`/albums/${encodeURIComponent(id)}/selection`, { method: "DELETE" }));
}

export function deleteAlbum(id: string) {
  if (!getAlbum(id)) return;
  state.albums = state.albums.filter((album) => album.id !== id);
  emit();
  sync(() => api(`/albums/${encodeURIComponent(id)}`, { method: "DELETE" }));
}

export function effectiveStatus(album: Album | null | undefined): EffectiveStatus {
  if (!album) return "draft";
  if (album.status === "draft" || album.status === "hidden") return album.status;
  const days = album.expiresAt ? daysUntil(album.expiresAt) : null;
  if (days != null && days < 0) return "expired";
  return album.status || "published";
}

export function galleryPath(album: Album): string {
  const studio = getStudio(album.studioId);
  return `/s/${studio?.slug || "studio"}/${album.slug}`;
}

export function albumUrl(album: Album): string {
  return `${location.origin}${galleryPath(album)}`;
}

export function extendExpiration(id: string, days = 30): Album | null {
  const album = getAlbum(id);
  if (!album) return null;
  const remaining = album.expiresAt ? daysUntil(album.expiresAt) : null;
  const base = remaining != null && remaining >= 0 ? parseISODate(album.expiresAt)! : new Date();
  base.setDate(base.getDate() + days);
  album.expiresAt = toISODate(base);
  album.updatedAt = now();
  emit();
  sync(() => api(`/albums/${encodeURIComponent(id)}/extend`, { body: { days } }));
  return album;
}

/* ---------- Public galleries ---------- */

export type GalleryState = "ok" | "invalid" | "suspended" | "expired" | "hidden" | "unpublished" | "password";

export interface PublicGallery {
  state: GalleryState;
  admin: boolean;
  status?: EffectiveStatus;
  studio: Studio | null;
  album: Album | null;
}

const galleries = new Map<string, PublicGallery>();

function albumTokens(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(TOKEN_KEY) || "{}");
  } catch {
    return {};
  }
}

const galleryKey = (studioSlug: string, albumSlug: string) => `${studioSlug}/${albumSlug}`;

export function getPublicGallery(studioSlug: string, albumSlug: string): PublicGallery | null {
  return galleries.get(galleryKey(studioSlug, albumSlug)) || null;
}

export async function loadPublicGallery(studioSlug: string, albumSlug: string): Promise<void> {
  const key = galleryKey(studioSlug, albumSlug);
  const token = albumTokens()[key];
  try {
    const result = await api<PublicGallery>(`/public/${encodeURIComponent(studioSlug)}/${encodeURIComponent(albumSlug)}`, {
      headers: token ? { "x-album-token": token } : {},
    });
    galleries.set(key, result);
  } catch {
    // A failed background refresh keeps showing the album already on screen.
    if (galleries.has(key)) return;
    galleries.set(key, { state: "invalid", admin: false, studio: null, album: null });
  }
  emit();
}

export async function submitSelection(
  studioSlug: string,
  albumSlug: string,
  picks: Pick<AlbumSelection, "photoIds" | "note" | "photoNotes">,
): Promise<Outcome<{ selection: AlbumSelection }>> {
  const key = galleryKey(studioSlug, albumSlug);
  const token = albumTokens()[key];
  try {
    const { selection } = await api<{ selection: AlbumSelection }>(
      `/public/${encodeURIComponent(studioSlug)}/${encodeURIComponent(albumSlug)}/selection`,
      { method: "PUT", body: picks, headers: token ? { "x-album-token": token } : {} },
    );
    const gallery = galleries.get(key);
    if (gallery?.album) gallery.album.selection = selection;
    emit();
    return { ok: true, selection };
  } catch (error) {
    if (error instanceof ApiError && error.status === 423) await loadPublicGallery(studioSlug, albumSlug);
    return { ok: false, error: errorMessage(error, "Chưa gửi được lựa chọn. Vui lòng thử lại.") };
  }
}

export async function unlock(studioSlug: string, albumSlug: string, password: string): Promise<Outcome> {
  try {
    const { token } = await api<{ token: string }>(`/public/${encodeURIComponent(studioSlug)}/${encodeURIComponent(albumSlug)}/unlock`, {
      body: { password },
    });
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ ...albumTokens(), [galleryKey(studioSlug, albumSlug)]: token }));
    await loadPublicGallery(studioSlug, albumSlug);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

// Links from before studios existed were /gallery/:slug.
export async function findLegacyAlbum(slug: string): Promise<string | null> {
  try {
    return (await api<{ path: string }>(`/public-legacy/${encodeURIComponent(slug)}`)).path;
  } catch {
    return null;
  }
}

/* ---------- Photos ---------- */

export interface UploadEvent {
  id: string;
  file: File;
  status: "queued" | "uploading" | "success" | "failed";
  progress?: number;
  error?: string;
  // Failed for a reason that may go away (network, server); the user can try the same file again.
  retryable?: boolean;
  photoId?: string;
}

export interface UploadEntry {
  id: string;
  file: File;
}

interface UploadIntent {
  photoId: string;
  key: string;
  uploadUrl: string;
  variants: Record<"preview" | "thumb", { key: string; uploadUrl: string }>;
}

const UPLOAD_CONCURRENCY = 3;
const uploadQueue: Array<() => Promise<void>> = [];
let activeUploads = 0;
// Bytes of uploads in flight, so parallel uploads cannot overrun the quota between them.
let reservedBytes = 0;

function pumpUploads() {
  while (activeUploads < UPLOAD_CONCURRENCY && uploadQueue.length) {
    const task = uploadQueue.shift()!;
    activeUploads++;
    void task().finally(() => {
      activeUploads--;
      pumpUploads();
    });
  }
}

export function uploadsInFlight(): boolean {
  return activeUploads > 0 || uploadQueue.length > 0;
}

async function uploadOne(albumId: string, { id, file }: UploadEntry, onItem?: (event: UploadEvent) => void) {
  const report = (event: Omit<UploadEvent, "id" | "file">) => onItem?.({ id, file, ...event });
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const typeOk = !file.type || ACCEPTED_TYPES.has(file.type);
  if (!ACCEPTED_EXT.has(ext) || !typeOk || file.size <= 0) {
    report({ status: "failed", error: "Chỉ chấp nhận tệp JPG, PNG hoặc WEBP." });
    return;
  }
  const stats = storageStats();
  if (stats.used + reservedBytes + file.size > stats.quota) {
    report({ status: "failed", error: `Vượt dung lượng gói ${getPlan().name}` });
    return;
  }
  reservedBytes += file.size;
  report({ status: "uploading", progress: 0.02 });
  try {
    const variants = await makeVariants(file);
    if (!variants) {
      report({ status: "failed", error: "Tệp này không phải ảnh hợp lệ." });
      return;
    }
    const path = `/albums/${encodeURIComponent(albumId)}`;
    const intent = await withRetry(() =>
      api<UploadIntent>(`${path}/uploads`, { body: { name: file.name, type: file.type, size: file.size } }),
    );
    const parts = [
      { blob: file as Blob, url: intent.uploadUrl, required: true },
      ...(["preview", "thumb"] as const).flatMap((name) => {
        const blob = variants[name];
        return blob ? [{ blob, url: intent.variants[name].uploadUrl, required: false, name }] : [];
      }),
    ];
    const total = parts.reduce((sum, part) => sum + part.blob.size, 0);
    const loaded = parts.map(() => 0);
    const sent: Partial<Record<"preview" | "thumb", string>> = {};
    for (const [index, part] of parts.entries()) {
      try {
        await withRetry(() =>
          uploadFile(part.url, part.blob, (value) => {
            loaded[index] = value * part.blob.size;
            report({ status: "uploading", progress: Math.min(0.95, loaded.reduce((sum, bytes) => sum + bytes, 0) / total) });
          }),
        );
        if ("name" in part && part.name) sent[part.name] = intent.variants[part.name].key;
      } catch (error) {
        // Without a resized copy the gallery shows the original, so only the original is required.
        if (part.required) throw error;
      }
    }
    const { photo, coverId } = await withRetry(() =>
      api<{ photo: Photo; coverId: string }>(`${path}/photos`, {
        body: {
          photoId: intent.photoId,
          key: intent.key,
          previewKey: sent.preview,
          thumbKey: sent.thumb,
          name: file.name,
          w: variants.w,
          h: variants.h,
        },
      }),
    );
    const album = getAlbum(albumId);
    if (album && !album.photos.some((item) => item.id === photo.id)) {
      album.photos.push(photo);
      album.coverId = coverId;
      album.updatedAt = now();
      emit();
    }
    report({ status: "success", progress: 1, photoId: photo.id });
  } catch (error) {
    // 403 is an expired upload URL; trying again asks for a fresh one.
    const status = error instanceof ApiError ? error.status : 0;
    const rejected = status >= 400 && status < 500 && status !== 429 && status !== 403;
    report({ status: "failed", error: errorMessage(error, "Không tải được tệp này lên."), retryable: !rejected });
  } finally {
    reservedBytes -= file.size;
  }
}

// Files upload a few at a time. Each step (upload URL, file, confirm) retries on its own
// when the connection drops, so one flaky request does not cost the whole photo.
export async function addPhotos(albumId: string, entries: UploadEntry[], onItem?: (event: UploadEvent) => void) {
  if (!getAlbum(albumId)) return;
  await Promise.all(
    entries.map(
      (entry) =>
        new Promise<void>((resolve) => {
          onItem?.({ ...entry, status: "queued", progress: 0 });
          uploadQueue.push(() => uploadOne(albumId, entry, onItem).finally(resolve));
          pumpUploads();
        }),
    ),
  );
}

// Puts a new file (usually the retouched version) behind an existing photo.
export async function replacePhotoFile(albumId: string, photoId: string, file: File, onProgress?: (value: number) => void): Promise<Outcome> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ACCEPTED_EXT.has(ext) || (file.type && !ACCEPTED_TYPES.has(file.type))) return { ok: false, error: "Chỉ chấp nhận tệp JPG, PNG hoặc WEBP." };
  const variants = await makeVariants(file);
  if (!variants) return { ok: false, error: "Tệp này không phải ảnh hợp lệ." };
  const path = `/albums/${encodeURIComponent(albumId)}/photos/${encodeURIComponent(photoId)}`;
  try {
    const intent = await withRetry(() =>
      api<UploadIntent & { revision: string }>(`${path}/replace`, { body: { name: file.name, type: file.type, size: file.size } }),
    );
    await withRetry(() => uploadFile(intent.uploadUrl, file, (value) => onProgress?.(value * 0.9)));
    const sent: Partial<Record<"preview" | "thumb", string>> = {};
    for (const name of ["preview", "thumb"] as const) {
      const blob = variants[name];
      if (!blob) continue;
      try {
        await withRetry(() => uploadFile(intent.variants[name].uploadUrl, blob));
        sent[name] = intent.variants[name].key;
      } catch {
        // The gallery falls back to the original.
      }
    }
    const { photo } = await withRetry(() =>
      api<{ photo: Photo }>(`${path}/file`, {
        method: "PUT",
        body: { revision: intent.revision, key: intent.key, previewKey: sent.preview, thumbKey: sent.thumb, w: variants.w, h: variants.h },
      }),
    );
    const album = getAlbum(albumId);
    if (album) {
      album.photos = album.photos.map((item) => (item.id === photo.id ? photo : item));
      album.updatedAt = now();
      emit();
    }
    onProgress?.(1);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Không tải được ảnh đã sửa lên.") };
  }
}

export async function markEditDone(albumId: string, photoId: string, reply: string, replaced: boolean): Promise<Outcome> {
  return editRequest(albumId, photoId, "PUT", { reply, replaced });
}

export async function undoEditDone(albumId: string, photoId: string): Promise<Outcome> {
  return editRequest(albumId, photoId, "DELETE");
}

async function editRequest(albumId: string, photoId: string, method: "PUT" | "DELETE", body?: object): Promise<Outcome> {
  try {
    const { selection } = await api<{ selection: AlbumSelection }>(
      `/albums/${encodeURIComponent(albumId)}/selection/edits/${encodeURIComponent(photoId)}`,
      { method, body },
    );
    const album = getAlbum(albumId);
    if (album) {
      album.selection = selection;
      emit();
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function uploadCover(file: File): Promise<string> {
  const intent = await api<{ key: string; uploadUrl: string }>("/uploads/cover", { body: { name: file.name, type: file.type, size: file.size } });
  await uploadFile(intent.uploadUrl, file);
  return intent.key;
}

function saveOrder(album: Album) {
  album.updatedAt = now();
  emit();
  const ids = album.photos.map((photo) => photo.id);
  sync(() => api(`/albums/${encodeURIComponent(album.id)}/photos/order`, { method: "PUT", body: { ids } }));
}

export function deletePhotos(albumId: string, ids: string[]) {
  const album = getAlbum(albumId);
  if (!album) return;
  const remove = new Set(ids);
  album.photos = album.photos.filter((photo) => !remove.has(photo.id));
  if (remove.has(album.coverId)) album.coverId = album.photos[0]?.id || "";
  if (remove.has(album.mobileCoverId)) album.mobileCoverId = "";
  album.updatedAt = now();
  emit();
  sync(() => api(`/albums/${encodeURIComponent(albumId)}/photos/delete`, { body: { ids } }));
}

export function reorderPhotos(albumId: string, orderedIds: string[]) {
  const album = getAlbum(albumId);
  if (!album) return;
  const map = new Map(album.photos.map((photo) => [photo.id, photo]));
  const next = orderedIds.map((id) => map.get(id)).filter((photo): photo is Photo => Boolean(photo));
  const leftovers = album.photos.filter((photo) => !orderedIds.includes(photo.id));
  album.photos = next.concat(leftovers);
  saveOrder(album);
}

export function movePhoto(albumId: string, photoId: string, delta: number) {
  const album = getAlbum(albumId);
  if (!album) return;
  const index = album.photos.findIndex((photo) => photo.id === photoId);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= album.photos.length) return;
  const [item] = album.photos.splice(index, 1);
  album.photos.splice(target, 0, item);
  saveOrder(album);
}

export type SortMode = "manual" | "name" | "newest" | "oldest" | "size";

export function sortPhotos(albumId: string, mode: SortMode) {
  const album = getAlbum(albumId);
  if (!album || mode === "manual") return;
  const list = [...album.photos];
  const time = (photo: Photo) => new Date(photo.uploadedAt).getTime();
  if (mode === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  if (mode === "newest") list.sort((a, b) => time(b) - time(a));
  if (mode === "oldest") list.sort((a, b) => time(a) - time(b));
  if (mode === "size") list.sort((a, b) => b.size - a.size);
  album.photos = list;
  saveOrder(album);
}

// Only the presentation changes: photos, details and the share slug stay as they are.
export function setAlbumTemplate(albumId: string, templateId: string): Album | null {
  if (!isTemplateId(templateId)) return null;
  return updateAlbum(albumId, { templateId });
}

export function setCover(albumId: string, photoId: string) {
  updateAlbum(albumId, { coverId: photoId, coverDataUrl: "", coverSession: false, coverKey: "" });
}

// Empty `photoId` goes back to using the main cover on phones.
export function setMobileCover(albumId: string, photoId: string) {
  updateAlbum(albumId, { mobileCoverId: photoId });
}

/* ---------- Studio statistics ---------- */

export interface StorageRow {
  album: Album;
  photos: number;
  bytes: number;
}

export interface StorageStats {
  rows: StorageRow[];
  used: number;
  quota: number;
  available: number;
  ratio: number;
}

export function storageStats(): StorageStats {
  const quota = getPlan().storage;
  const rows = state.albums
    .map((album) => ({
      album,
      photos: album.photos.length,
      bytes: album.photos.reduce((sum, photo) => sum + (photo.size || 0), 0),
    }))
    .sort((a, b) => b.bytes - a.bytes);
  const used = rows.reduce((sum, row) => sum + row.bytes, 0);
  return { rows, used, quota, available: Math.max(0, quota - used), ratio: quota ? used / quota : 0 };
}

export interface MonthStat {
  label: string;
  albums: number;
  bytes: number;
  photos: number;
}

export function getMonthlyStats(months = 8): MonthStat[] {
  const albums = state.albums;
  const today = new Date();
  const series: MonthStat[] = [];
  for (let index = months - 1; index >= 0; index -= 1) {
    const start = new Date(today.getFullYear(), today.getMonth() - index, 1);
    const end = new Date(today.getFullYear(), today.getMonth() - index + 1, 1);
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
  const albums = state.albums;
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

export interface ExpiringItem {
  album: Album;
  status: EffectiveStatus;
  days: number;
}

export function getExpiring(within = 14): ExpiringItem[] {
  return state.albums
    .map((album) => ({ album, status: effectiveStatus(album), days: album.expiresAt ? daysUntil(album.expiresAt) : null }))
    .filter((item): item is ExpiringItem => item.status === "published" && item.days != null && item.days >= 0 && item.days <= within)
    .sort((a, b) => a.days - b.days);
}

export interface Notification {
  id: string;
  title: string;
  meta: string;
  href: string;
}

export function getNotifications(): Notification[] {
  const studioId = currentStudioId();
  const studio = currentStudio();
  const items: Notification[] = [];
  if (studio && isPlanExpired(studio)) {
    items.push({
      id: `${studioId}:plan-expired:${studio.planExpiresAt}`,
      title: state.pendingPayment
        ? `Gói ${getPlan().name} đã hết hạn — đang chờ duyệt gia hạn`
        : `Gói ${getPlan().name} đã hết hạn từ ${formatVNDate(studio.planExpiresAt)}`,
      meta: "Gói dịch vụ · Cần gia hạn",
      href: "/admin/settings?tab=plan",
    });
  } else if (studio && isPlanExpiringSoon(studio) && !state.pendingPayment) {
    const days = daysUntilPlanExpiry(studio);
    items.push({
      id: `${studioId}:plan-expiring:${studio.planExpiresAt}`,
      title: `Gói ${getPlan().name} sắp hết hạn (${days === 1 ? "còn 1 ngày" : `còn ${days} ngày`}, đến ${formatVNDate(studio.planExpiresAt)})`,
      meta: "Gói dịch vụ · Đóng phí đầu tháng",
      href: "/admin/settings?tab=plan",
    });
  }
  getExpiring().forEach((item) => {
    items.push({
      id: `${studioId}:exp-${item.album.id}`,
      title: `${item.album.name} ${item.days === 0 ? "hết hạn hôm nay" : `sẽ hết hạn sau ${item.days} ngày`}`,
      meta: "Thời hạn truy cập",
      href: `/admin/albums/${item.album.id}/share`,
    });
  });
  getAlbums()
    .filter((album) => album.selection)
    .sort((a, b) => b.selection!.submittedAt.localeCompare(a.selection!.submittedAt))
    .forEach((album) => {
      const favorites = album.selection!.photoIds.length;
      const requests = Object.keys(album.selection!.photoNotes || {}).length;
      const parts = [favorites ? `${favorites} ảnh yêu thích` : "", requests ? `${requests} ảnh cần sửa` : ""].filter(Boolean);
      items.push({
        id: `${studioId}:sel-${album.id}-${album.selection!.submittedAt}`,
        title: `${album.customerName || album.name} đã gửi ${parts.join(", ")}`,
        meta: album.selectionLocked ? "Lựa chọn của khách · đã chốt" : "Lựa chọn của khách",
        href: `/admin/albums/${album.id}/photos?picked=${favorites ? "favorite" : "edit"}`,
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

// Read state is a per-browser preference, so it stays in localStorage.
function readNotifications(): string[] {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) || "[]");
  } catch {
    return [];
  }
}

export function isNotificationRead(id: string): boolean {
  return readNotifications().includes(id);
}

export function markNotificationRead(id: string) {
  markAllNotificationsRead([id]);
}

export function markAllNotificationsRead(ids: string[]) {
  localStorage.setItem(READ_KEY, JSON.stringify([...new Set([...readNotifications(), ...ids])].slice(-500)));
  emit();
}

/* ---------- Platform console ---------- */

export interface StudioRow {
  studio: Studio;
  plan: Plan;
  usage: Usage;
  owner: User | null;
}

let platformRows: Array<Omit<StudioRow, "plan">> | null = null;
let platformBank: PlatformBank | null = null;
let platformPayments: PlatformPaymentRequest[] = [];

export async function loadPlatform(): Promise<void> {
  try {
    const [studiosRes, billingRes] = await Promise.all([
      api<{ studios: Array<Omit<StudioRow, "plan">> }>("/platform/studios"),
      api<{ bank: PlatformBank; requests: PlatformPaymentRequest[] }>("/platform/billing"),
    ]);
    platformRows = studiosRes.studios;
    platformBank = billingRes.bank;
    platformPayments = billingRes.requests;
  } catch (error) {
    toast(errorMessage(error, "Không tải được dữ liệu nền tảng."), "error");
  }
  emit();
}

export function listStudios(): StudioRow[] {
  return (platformRows || []).map((row) => ({ ...row, plan: getPlanById(row.studio.planId) }));
}

export function platformLoaded(): boolean {
  return platformRows != null;
}

export function getPlatformBankConfig(): PlatformBank {
  return platformBank || { bankId: "", bankAccount: "", accountName: "", transferPrefix: "PICORA" };
}

export function listPlatformPayments(): PlatformPaymentRequest[] {
  return platformPayments;
}

export async function savePlatformBank(input: PlatformBank): Promise<Outcome<{ bank: PlatformBank }>> {
  try {
    const { bank } = await api<{ bank: PlatformBank }>("/platform/bank", { method: "PUT", body: input });
    platformBank = bank;
    emit();
    return { ok: true, bank };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function approvePaymentRequest(id: string, note = ""): Promise<{ ok: boolean; warning?: string; error?: string }> {
  try {
    const result = await api<{ studio: Studio; request: PlatformPaymentRequest; warning: string }>(
      `/platform/payments/${encodeURIComponent(id)}/approve`,
      { body: { note } },
    );
    platformPayments = platformPayments.map((item) => (item.id === id ? result.request : item));
    platformRows = (platformRows || []).map((row) => (row.studio.id === result.studio.id ? { ...row, studio: result.studio } : row));
    if (state.studios.some((item) => item.studio.id === result.studio.id)) replaceStudio(result.studio);
    emit();
    return { ok: true, warning: result.warning || undefined };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function rejectPaymentRequest(id: string, note: string): Promise<Outcome> {
  try {
    const result = await api<{ request: PlatformPaymentRequest }>(`/platform/payments/${encodeURIComponent(id)}/reject`, { body: { note } });
    platformPayments = platformPayments.map((item) => (item.id === id ? result.request : item));
    emit();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function createStudio(input: {
  studioName: string;
  studioSlug: string;
  planId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}): Promise<FormOutcome<{ studio: Studio; owner: Pick<User, "id" | "name" | "email">; existing: boolean }>> {
  try {
    const result = await api<{ studio: Studio; owner: User; existing: boolean }>("/platform/studios", { body: input });
    await loadPlatform();
    return { ok: true, ...result };
  } catch (error) {
    const errors = (error as { data?: { errors?: Record<string, string> } }).data?.errors;
    return { ok: false, errors: errors || { studioName: errorMessage(error) } };
  }
}

async function patchPlatformStudio(studioId: string, body: Record<string, string | null>): Promise<{ ok: boolean; warning?: string; error?: string }> {
  try {
    const result = await api<{ studio: Studio; warning: string }>(`/platform/studios/${encodeURIComponent(studioId)}`, { method: "PATCH", body });
    platformRows = (platformRows || []).map((row) => (row.studio.id === studioId ? { ...row, studio: result.studio } : row));
    if (state.studios.some((item) => item.studio.id === studioId)) replaceStudio(result.studio);
    emit();
    return { ok: true, warning: result.warning || undefined };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export function setStudioStatus(studioId: string, status: StudioStatus) {
  return patchPlatformStudio(studioId, { status });
}

// The platform may move a studio to any plan; usage over the new limit only blocks new uploads.
export function setStudioPlan(studioId: string, planId: string) {
  return patchPlatformStudio(studioId, { planId });
}

export function setStudioExpiry(studioId: string, planExpiresAt: string | null) {
  return patchPlatformStudio(studioId, { planExpiresAt });
}

export async function resetDemo(): Promise<Outcome> {
  try {
    await api("/demo/reset", { body: {} });
    galleries.clear();
    await hydrate();
    applyBrand(getSettings());
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
