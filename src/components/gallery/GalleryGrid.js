import { photoSrc } from "../../data/media.js";
import { esc } from "../../utils/format.js";
import { responsiveSet } from "./GalleryHero.js";

// A clickable photo frame. `ratio` fixes the framing and the server-side crop; `aspect`
// swaps the inline ratio for responsive aspect classes. Without either, the photo keeps
// its own proportions.
export function frame(
  model,
  index,
  { ratio, aspect = "", width = 1200, sizes = "100vw", className = "", imgClass = "", overlay = "", eager = false } = {},
) {
  const photo = model.photos[index];
  if (!photo) return "";
  const natural = (photo.w || 4) / (photo.h || 3);
  const style = aspect ? "" : `style="aspect-ratio:${ratio || natural}"`;
  const src = photoSrc(photo, width, ratio);
  const set = responsiveSet(photo, width, ratio);
  return `
    <button type="button" data-open="${index}" aria-label="Mở ảnh ${index + 1} trên ${model.photos.length}" class="group relative block w-full overflow-hidden ${aspect} ${className}" ${style}>
      <img src="${esc(src)}" ${set ? `srcset="${set}" sizes="${sizes}"` : ""} alt="" ${eager ? "" : 'loading="lazy"'} decoding="async" draggable="false" class="h-full w-full object-cover ${imgClass}" />
      ${overlay}
    </button>`;
}
