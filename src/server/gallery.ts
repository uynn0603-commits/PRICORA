import type { Album, Studio } from "@/lib/types";
import { safeEqual, sign } from "./crypto";
import { findStudioBySlug, getAlbumBySlug, toStudio } from "./data";
import type { Tx } from "./db";
import { env } from "./env";

export type GalleryState = "ok" | "password" | "expired" | "hidden" | "unpublished" | "suspended" | "invalid";

export interface GalleryAccess {
  state: GalleryState;
  admin: boolean;
  status?: string;
  studio: Studio | null;
  album: Album | null;
}

export function albumToken(album: Pick<Album, "id" | "password">) {
  return sign(`album:${album.id}:${album.password}`, env.sessionSecret);
}

// Decides what a visitor may see of /s/:studio/:album. Members of the owning studio see
// every album; everyone else needs a published, unexpired album and, if set, its password.
export async function resolveGallery(
  tx: Tx,
  studioSlug: string,
  albumSlug: string,
  { studioId, token }: { studioId?: string | null; token?: string } = {},
): Promise<GalleryAccess> {
  const studioRow = await findStudioBySlug(tx, studioSlug);
  if (!studioRow) return { state: "invalid", admin: false, studio: null, album: null };
  const studio = toStudio(studioRow);
  const found = await getAlbumBySlug(tx, studio.id, albumSlug);
  if (!found) return { state: "invalid", admin: false, studio, album: null };

  const { album, expired } = found;
  const admin = Boolean(studioId && studioId === studio.id);
  const status = album.status === "draft" || album.status === "hidden" ? album.status : expired ? "expired" : album.status;
  let state: GalleryState = "ok";
  if (!admin) {
    if (studio.status !== "active") state = "suspended";
    else if (status === "expired") state = "expired";
    else if (status === "hidden") state = "hidden";
    else if (status === "draft") state = "unpublished";
    else if (album.password && !safeEqual(token || "", albumToken(album))) state = "password";
  }
  return { state, admin, status, studio, album };
}
