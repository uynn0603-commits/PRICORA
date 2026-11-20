import { studioSettings } from "@/lib/mock";
import type { Album, AlbumStatus, Membership, Photo, PhotoEdit, Role, Studio, StudioSettings, StudioStatus, User } from "@/lib/types";
import type { Tx } from "./db";
import { publicUrl } from "./storage";

/* ---------- Row shapes (columns arrive camelCased) ---------- */

export interface StudioRow {
  id: string;
  slug: string;
  name: string;
  planId: string;
  status: StudioStatus;
  settings: Partial<StudioSettings> | null;
  createdAt: Date;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  platformAdmin: boolean;
  avatarKey?: string;
}

interface AlbumRow {
  id: string;
  studioId: string;
  slug: string;
  name: string;
  customerName: string;
  customerPhone: string;
  occasion: string;
  shootingDate: string;
  description: string;
  coverId: string;
  mobileCoverId: string;
  coverKey: string;
  password: string;
  expiresAt: string;
  status: AlbumStatus;
  templateId: string;
  allowDownload: boolean;
  selectionEnabled: boolean;
  selectionLimit: number | null;
  selectionLocked: boolean;
  selection: {
    photo_ids: string[];
    note: string;
    photo_notes?: Record<string, string>;
    photo_edits?: Record<string, PhotoEdit>;
    submitted_at: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  expired: boolean;
}

export interface PhotoRow {
  id: string;
  albumId: string;
  name: string;
  unsplash: string | null;
  storageKey: string | null;
  previewKey: string | null;
  thumbKey: string | null;
  focal: string;
  width: number;
  height: number;
  size: number;
  uploadedAt: Date;
}

/* ---------- Serializers (match src/lib/types.ts) ---------- */

export function toStudio(row: StudioRow): Studio {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    planId: row.planId,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    settings: studioSettings(row.settings || {}),
  };
}

export function toUser(row: UserRow): User {
  return { id: row.id, name: row.name, email: row.email, avatarUrl: publicUrl(row.avatarKey || "") || undefined, platformAdmin: row.platformAdmin || undefined };
}

export function toPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    name: row.name,
    ...(row.unsplash
      ? { unsplash: row.unsplash }
      : {
          url: publicUrl(row.storageKey || ""),
          ...(row.previewKey ? { preview: publicUrl(row.previewKey) } : {}),
          ...(row.thumbKey ? { thumb: publicUrl(row.thumbKey) } : {}),
        }),
    fp: row.focal,
    w: row.width,
    h: row.height,
    size: Number(row.size),
    uploadedAt: row.uploadedAt.toISOString(),
    sessionOnly: false,
  };
}

function toAlbum(row: AlbumRow, photos: Photo[]): Album {
  return {
    id: row.id,
    studioId: row.studioId,
    slug: row.slug,
    name: row.name,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    occasion: row.occasion,
    shootingDate: row.shootingDate,
    description: row.description,
    coverId: row.coverId,
    mobileCoverId: row.mobileCoverId,
    coverDataUrl: publicUrl(row.coverKey),
    coverSession: false,
    password: row.password,
    expiresAt: row.expiresAt,
    status: row.status,
    templateId: row.templateId,
    allowDownload: row.allowDownload,
    selectionEnabled: row.selectionEnabled,
    selectionLimit: row.selectionLimit || 0,
    selectionLocked: row.selectionLocked,
    selection: row.selection
      ? {
          photoIds: row.selection.photo_ids,
          note: row.selection.note,
          photoNotes: row.selection.photo_notes || {},
          photoEdits: row.selection.photo_edits || {},
          submittedAt: new Date(row.selection.submitted_at).toISOString(),
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    photos,
  };
}

/* ---------- Queries ---------- */

export const STUDIO_COLUMNS = "id, slug, name, plan_id, status, settings, created_at";

export async function findStudio(tx: Tx, id: string): Promise<StudioRow | null> {
  const [row] = await tx.unsafe<StudioRow[]>(`select ${STUDIO_COLUMNS} from studios where id = $1`, [id]);
  return row || null;
}

export async function findStudioBySlug(tx: Tx, slug: string): Promise<StudioRow | null> {
  const [row] = await tx.unsafe<StudioRow[]>(`select ${STUDIO_COLUMNS} from studios where slug = $1`, [slug]);
  return row || null;
}

const ALBUM_SELECT = `
  select id, studio_id, slug, name, customer_name, customer_phone, occasion,
    coalesce(shooting_date::text, '') as shooting_date, description, cover_id, mobile_cover_id, cover_key, password,
    coalesce(expires_at::text, '') as expires_at, status, template_id, allow_download, created_at, updated_at,
    selection_enabled, selection_limit, selection_locked,
    (select to_jsonb(s) from album_selections s where s.album_id = albums.id) as selection,
    (expires_at is not null and expires_at < current_date) as expired
  from albums`;

export const PHOTO_COLUMNS = "id, album_id, name, unsplash, storage_key, preview_key, thumb_key, focal, width, height, size::float8 as size, uploaded_at";

const PHOTO_SELECT = `select ${PHOTO_COLUMNS} from photos`;

async function withPhotos(tx: Tx, rows: AlbumRow[]): Promise<Album[]> {
  if (!rows.length) return [];
  const photos = await tx.unsafe<PhotoRow[]>(`${PHOTO_SELECT} where album_id = any($1::text[]) order by position, id`, [rows.map((row) => row.id)]);
  const byAlbum = new Map<string, Photo[]>();
  photos.forEach((photo) => {
    const list = byAlbum.get(photo.albumId) || [];
    list.push(toPhoto(photo));
    byAlbum.set(photo.albumId, list);
  });
  return rows.map((row) => toAlbum(row, byAlbum.get(row.id) || []));
}

export async function listAlbums(tx: Tx, studioId: string): Promise<Album[]> {
  const rows = await tx.unsafe<AlbumRow[]>(`${ALBUM_SELECT} where studio_id = $1 order by created_at desc`, [studioId]);
  return withPhotos(tx, rows);
}

export async function getAlbum(tx: Tx, studioId: string, albumId: string): Promise<Album | null> {
  const rows = await tx.unsafe<AlbumRow[]>(`${ALBUM_SELECT} where studio_id = $1 and id = $2`, [studioId, albumId]);
  return (await withPhotos(tx, rows))[0] || null;
}

export async function getAlbumBySlug(tx: Tx, studioId: string, slug: string): Promise<{ album: Album; expired: boolean } | null> {
  const rows = await tx.unsafe<AlbumRow[]>(`${ALBUM_SELECT} where studio_id = $1 and slug = $2`, [studioId, slug]);
  if (!rows[0]) return null;
  const [album] = await withPhotos(tx, rows);
  return { album, expired: rows[0].expired };
}

export interface MemberView extends Membership {
  user: User;
}

export async function listMembers(tx: Tx, studioId: string): Promise<MemberView[]> {
  const rows = await tx<Array<UserRow & { role: Role; createdAt: Date }>>`
    select u.id, u.name, u.email, u.platform_admin, u.avatar_key, m.role, m.created_at
    from memberships m join users u on u.id = m.user_id
    where m.studio_id = ${studioId}
    order by case m.role when 'owner' then 0 else 1 end, u.name`;
  return rows.map((row) => ({ userId: row.id, studioId, role: row.role, createdAt: row.createdAt.toISOString(), user: toUser(row) }));
}

export interface Usage {
  albums: number;
  photos: number;
  storage: number;
  members: number;
}

export async function studioUsage(tx: Tx, studioId: string): Promise<Usage> {
  const [row] = await tx<Usage[]>`
    select
      (select count(*)::int from albums where studio_id = ${studioId}) as albums,
      (select count(*)::int from photos where studio_id = ${studioId}) as photos,
      (select coalesce(sum(size), 0)::float8 from photos where studio_id = ${studioId}) as storage,
      (select count(*)::int from memberships where studio_id = ${studioId}) as members`;
  return row;
}
