import type { InvitationContent } from "@/lib/invitation-content";

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
  planExpiresAt: string | null;
  status: StudioStatus;
  createdAt: string;
  settings: StudioSettings;
}

export type PaymentKind = "change" | "renew";
export type PaymentStatus = "pending" | "approved" | "rejected";

export interface PlatformBank {
  bankId: string;
  bankAccount: string;
  accountName: string;
  transferPrefix: string;
  updatedAt?: string;
}

export interface PaymentRequest {
  id: string;
  studioId: string;
  kind: PaymentKind;
  targetPlanId: string;
  amount: number;
  transferCode: string;
  receiptUrl: string;
  note: string;
  status: PaymentStatus;
  adminNote: string;
  reviewedAt: string | null;
  appliedExpiresAt: string | null;
  createdAt: string;
}

export interface PlatformPaymentRequest extends PaymentRequest {
  studioName: string;
  studioSlug: string;
  currentPlanId: string;
  currentPlanExpiresAt: string | null;
  submitterName: string;
  submitterEmail: string;
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
  // How many invitations the plan may create. `null` means unlimited.
  invitations: number | null;
  description: string;
}

export type InvitationStatus = "published" | "draft";

export interface Invitation {
  id: string;
  studioId: string;
  albumId: string;
  slug: string;
  status: InvitationStatus;
  templateId: string;
  groomName: string;
  brideName: string;
  groomParents: string;
  brideParents: string;
  weddingDate: string;
  weddingTime: string;
  venue: string;
  address: string;
  mapUrl: string;
  message: string;
  thankYou: string;
  musicUrl: string;
  photoIds: string[];
  // Structured Traditional Wedding fields. Empty for the older templates.
  content: InvitationContent;
  createdAt: string;
  updatedAt: string;
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
