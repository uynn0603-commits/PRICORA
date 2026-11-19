import { esc, initials } from "../utils/format.js";

let sequence = 0;

const P_SHAPE =
  "M10 18a10 10 0 0 1 10-10h24a12 12 0 0 1 12 12v12a12 12 0 0 1-12 12H26v9a7 7 0 0 1-7 7h-4a5 5 0 0 1-5-5z";
const WINDOW = "M22 15h22a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V19a4 4 0 0 1 4-4z";

export const PLATFORM_NAME = "PICORA";

export function logoMark(size = 34, { mono = false } = {}) {
  if (mono) {
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path fill="currentColor" fill-rule="evenodd" d="${P_SHAPE}${WINDOW}"/>
        <circle cx="40" cy="21" r="2.6" fill="currentColor"/>
        <path d="M21.5 34.5 28 28l5 5 4-4 8 5.5z" fill="currentColor"/>
      </svg>`;
  }
  const id = `picoramark${sequence++}`;
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="${id}" x1="8" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop stop-color="#7552F6"/>
          <stop offset="1" stop-color="#C94DEB"/>
        </linearGradient>
      </defs>
      <path fill="url(#${id})" d="${P_SHAPE}"/>
      <rect x="18" y="15" width="30" height="22" rx="4" fill="#fff"/>
      <circle cx="40" cy="21" r="3" fill="#FFB547"/>
      <path d="M20.5 35.5 28 27l5 5 4-4 9 7.5z" fill="#7552F6"/>
      <path d="M58 3.5 59 6.8l3.3 1-3.3 1L58 12.2l-1-3.4-3.3-1 3.3-1z" fill="#FFB547"/>
    </svg>`;
}

function wordmark(name, { tone, compact }) {
  const color = tone === "dark" ? "text-white" : "text-ink";
  const size = compact ? "text-[13px] tracking-[0.18em]" : "text-[19px] tracking-[0.06em]";
  return `<span class="truncate font-bold uppercase leading-none ${size} ${color}" style="font-family:'Plus Jakarta Sans',sans-serif">${esc(name)}</span>`;
}

export function logoLockup({ tone = "light", size = 34, compact = false, mono = false } = {}) {
  const gap = compact ? "gap-2" : "gap-2.5";
  const markTone = mono ? (tone === "dark" ? "text-white" : "text-ink") : "";
  return `<span class="inline-flex min-w-0 items-center ${gap}"><span class="inline-flex shrink-0 ${markTone}">${logoMark(size, { mono })}</span>${wordmark(PLATFORM_NAME, { tone, compact })}</span>`;
}

// A studio's own symbol: the uploaded logo, or its initials on the brand colour.
export function studioMark(studio, size = 34, { mono = false, tone = "light" } = {}) {
  const logo = studio?.logoDataUrl || studio?.settings?.logoDataUrl;
  const style = `width:${size}px;height:${size}px`;
  if (logo) return `<img src="${logo}" alt="" class="shrink-0 rounded-lg object-cover" style="${style}" />`;
  const name = studio?.name || PLATFORM_NAME;
  const fill = mono ? (tone === "dark" ? "border border-white/60 text-white" : "border border-current") : "bg-primary text-white";
  return `<span class="grid shrink-0 place-items-center rounded-lg font-semibold ${fill}" style="${style};font-size:${Math.round(size * 0.38)}px">${esc(initials(name))}</span>`;
}

// Gallery headers and footers carry the studio's brand. Without a studio (template
// demos), they fall back to the PICORA mark.
export function studioLockup(studio, { tone = "light", size = 34, compact = false, mono = false } = {}) {
  if (!studio) return logoLockup({ tone, size, compact, mono });
  const gap = compact ? "gap-2" : "gap-2.5";
  return `<span class="inline-flex min-w-0 items-center ${gap}">${studioMark(studio, size, { mono, tone })}${wordmark(studio.name, { tone, compact })}</span>`;
}
