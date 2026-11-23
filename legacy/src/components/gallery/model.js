import { coverSrc, photoSrc } from "../../data/media.js";
import { occasionLabel } from "../../utils/format.js";
import { DEFAULT_TEMPLATE_ID, isTemplateId } from "../templates/catalog.js";

// Converts a stored album into the single shape every template renders from. Templates
// never read the store directly, so demo albums and real albums behave the same way.
// `studio` is the owning tenant's public brand; demo albums have none and show PICORA.
export function toGalleryModel(album, { templateId, studio } = {}) {
  const photos = album.photos.filter((photo) => photoSrc(photo));
  const coverPhoto =
    album.coverPhoto ||
    photos.find((photo) => photo.id === album.coverId) ||
    (album.coverDataUrl || album.coverSession ? null : photos[0]) ||
    null;
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
    photos,
    settings: {
      allowDownload: album.allowDownload !== false,
      passwordProtected: Boolean(album.password),
    },
  };
}

export function coverUrl(model, width, ratio) {
  if (model.coverPhoto) return photoSrc(model.coverPhoto, width, ratio);
  return model.coverImage || "";
}

export function lightboxPhotos(model) {
  return model.photos.map((photo) => ({ ...photo, src: photoSrc(photo, 2000) }));
}

export function splitCouple(name) {
  const parts = String(name || "").split(/\s*&\s*/).filter(Boolean);
  return parts.length === 2 ? parts : null;
}

export function pad(number, size = 2) {
  return String(number).padStart(size, "0");
}
