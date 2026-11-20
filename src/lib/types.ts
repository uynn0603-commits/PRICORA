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
  photoIds: string[];
  note: string;
  submittedAt: string;
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
