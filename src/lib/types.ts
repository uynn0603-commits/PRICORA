export type Role = "owner" | "staff";
export type AlbumStatus = "published" | "draft" | "hidden";
export type EffectiveStatus = AlbumStatus | "expired";
export type StudioStatus = "active" | "suspended";

export interface Photo {
  id: string;
  name: string;
  unsplash?: string;
  url?: string;
  preview?: string;
  thumb?: string;
  dataUrl?: string;
  fp?: string;
  w: number;
  h: number;
  size: number;
  uploadedAt: string;
  sessionOnly?: boolean;
}

export interface Album {
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
  // Cover for phones; empty falls back to coverId.
  mobileCoverId: string;
  coverDataUrl: string;
  coverSession: boolean;
  password: string;
  expiresAt: string;
  status: AlbumStatus;
  templateId: string;
  allowDownload: boolean;
  selectionEnabled: boolean;
  // 0 means the customer may pick any number of photos.
  selectionLimit: number;
  selectionLocked: boolean;
  selection: AlbumSelection | null;
  createdAt: string;
  updatedAt: string;
  photos: Photo[];
}

export interface AlbumSelection {
  // Favourites; the album's selection limit applies to these only.
  photoIds: string[];
  note: string;
  // Retouch requests keyed by photo id, independent of the favourites.
  photoNotes: Record<string, string>;
  // Studio's answers to those requests, keyed by photo id. Use `editDone` to read them.
  photoEdits: Record<string, PhotoEdit>;
  submittedAt: string;
}

export interface PhotoEdit {
  // The request this answers; a rewritten request makes the entry stale.
  request: string;
  reply: string;
  doneAt: string;
  // The studio uploaded the retouched file in place of the original.
  replaced: boolean;
}

export const PHOTO_NOTE_MAX = 500;
export const EDIT_REPLY_MAX = 500;

// The studio's answer for a photo, while it still matches the client's current request.
export function editDone(edits: Record<string, PhotoEdit> | undefined, photoId: string, request: string | undefined): PhotoEdit | null {
  const edit = edits?.[photoId];
  return edit && request && edit.request === request ? edit : null;
}

export interface StudioSettings {
  defaultExpirationDays: number;
  defaultPasswordProtection: boolean;
  slogan: string;
  primaryColor: string;
  secondaryColor: string;
  logoDataUrl: string;
}

export interface Studio {
  id: string;
  slug: string;
  name: string;
  planId: string;
  status: StudioStatus;
  createdAt: string;
  settings: StudioSettings;
}

export interface User {
  id: string;
  name: string;
  email: string;
  // Profile photo; without one the UI shows initials.
  avatarUrl?: string;
  // Only present in the seed data; the API never sends passwords to the browser.
  password?: string;
  platformAdmin?: boolean;
}

export interface Membership {
  userId: string;
  studioId: string;
  role: Role;
  createdAt: string;
}

export interface Database {
  version: number;
  users: User[];
  studios: Studio[];
  memberships: Membership[];
  albums: Album[];
  notificationsRead: string[];
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  storage: number;
  albums: number | null;
  members: number;
  description: string;
}

export interface Session {
  userId: string;
  studioId: string | null;
  at: number;
  user: User;
  role: Role | "platform";
  name: string;
  email: string;
}

export type Outcome<T = object> = ({ ok: true } & T) | { ok: false; error: string };
export type FormOutcome<T = object> = ({ ok: true } & T) | { ok: false; errors: Record<string, string> };

export interface GalleryStudio {
  name: string;
  slug: string;
  logoDataUrl: string;
  slogan: string;
}
