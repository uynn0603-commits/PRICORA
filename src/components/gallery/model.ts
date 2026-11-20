import { coverSrc, photoSrc } from "@/lib/media";
import { occasionLabel } from "@/lib/format";
import { DEFAULT_TEMPLATE_ID, isTemplateId } from "@/lib/catalog";
import type { Album, AlbumSelection, GalleryStudio, Photo, Studio } from "@/lib/types";

export type GalleryAlbum = Pick<
  Album,
  | "id"
  | "slug"
  | "name"
  | "customerName"
  | "shootingDate"
  | "occasion"
  | "description"
  | "templateId"
  | "coverId"
  | "coverDataUrl"
  | "coverSession"
  | "allowDownload"
  | "password"
  | "photos"
> &
  Partial<Pick<Album, "selectionEnabled" | "selectionLimit" | "selectionLocked" | "selection">> & { coverPhoto?: Photo | null };

export interface GallerySelection {
  studioSlug: string;
  limit: number;
  locked: boolean;
  preview: boolean;
  submitted: AlbumSelection | null;
}

export interface GalleryModel {
  id: string;
  slug: string;
  title: string;
  customerName: string;
  shootingDate: string;
  occasion: string;
  occasionLabel: string;
  description: string;
  templateId: string;
  studio: GalleryStudio | null;
  coverImage: string;
  coverPhoto: Photo | null;
  // The photos laid out below the cover. The cover already fills the hero, so it is
  // left out here; `allPhotos` still has it for the lightbox, downloads, picks and counts.
  photos: Photo[];
  allPhotos: Photo[];
  photoCount: number;
  settings: {
    allowDownload: boolean;
    passwordProtected: boolean;
  };
  // Present when the studio lets the client pick photos (e.g. for retouching or printing).
  selection: GallerySelection | null;
}

export type LightboxPhoto = Photo & { src?: string };

// Converts a stored album into the single shape every template renders from. Templates
// never read the store directly, so demo albums and real albums behave the same way.
// `studio` is the owning tenant's public brand; demo albums have none and show PICORA.
export function toGalleryModel(
  album: GalleryAlbum,
  { templateId, studio, preview = false }: { templateId?: string; studio?: Studio | null; preview?: boolean } = {},
): GalleryModel {
  const photos = album.photos.filter((photo) => photoSrc(photo));
  const coverPhoto =
    album.coverPhoto ||
    photos.find((photo) => photo.id === album.coverId) ||
    (album.coverDataUrl || album.coverSession ? null : photos[0]) ||
    null;
  const body = photos.length > 1 && coverPhoto ? photos.filter((photo) => photo.id !== coverPhoto.id) : photos;
  const requested = templateId || album.templateId;
  return {
    id: album.id,
    slug: album.slug,
    title: album.name,
    customerName: album.customerName || album.name,
    shootingDate: album.shootingDate,
    occasion: album.occasion || "",
    occasionLabel: occasionLabel(album.occasion),
    description: album.description || "",
    templateId: isTemplateId(requested) ? requested : DEFAULT_TEMPLATE_ID,
    studio: studio
      ? { name: studio.name, slug: studio.slug, logoDataUrl: studio.settings?.logoDataUrl || "", slogan: studio.settings?.slogan || "" }
      : null,
    coverImage: coverSrc(album, 2400),
    coverPhoto,
    photos: body,
    allPhotos: photos,
    photoCount: photos.length,
    settings: {
      allowDownload: album.allowDownload !== false,
      passwordProtected: Boolean(album.password),
    },
    selection:
      studio && album.selectionEnabled
        ? {
            studioSlug: studio.slug,
            limit: album.selectionLimit || 0,
            locked: Boolean(album.selectionLocked),
            preview,
            submitted: album.selection || null,
          }
        : null,
  };
}

export function coverUrl(model: GalleryModel, width: number, ratio?: number): string {
  if (model.coverPhoto) return photoSrc(model.coverPhoto, width, ratio);
  return model.coverImage || "";
}

export function lightboxPhotos(model: GalleryModel): LightboxPhoto[] {
  return model.allPhotos.map((photo) => ({ ...photo, src: photoSrc(photo, 2000) }));
}

export function splitCouple(name?: string): [string, string] | null {
  const parts = String(name || "")
    .split(/\s*&\s*/)
    .filter(Boolean);
  return parts.length === 2 ? [parts[0], parts[1]] : null;
}

export function pad(number: number, size = 2): string {
  return String(number).padStart(size, "0");
}
