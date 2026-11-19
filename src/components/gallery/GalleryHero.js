import { photoSrc } from "../../data/media.js";
import { esc } from "../../utils/format.js";
import { coverUrl } from "./model.js";

export function responsiveSet(photo, width, ratio) {
  if (!photo?.unsplash || photo.sessionOnly || photo.dataUrl) return "";
  const steps = [640, 1080, 1600, 2400].filter((step) => step < width).concat(width);
  return steps.map((step) => `${esc(photoSrc(photo, step, ratio))} ${step}w`).join(", ");
}

export function coverImage(model, { width = 2400, ratio, className = "", alt = "" } = {}) {
  const src = coverUrl(model, width, ratio);
  if (!src) return `<div class="${className} bg-black/10"></div>`;
  const set = responsiveSet(model.coverPhoto, width, ratio);
  return `<img src="${esc(src)}" ${set ? `srcset="${set}" sizes="100vw"` : ""} alt="${esc(alt)}" fetchpriority="high" decoding="async" class="${className} object-cover" />`;
}
