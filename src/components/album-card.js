import { coverSrc } from "../data/media.js";
import { effectiveStatus } from "../data/store.js";
import { getTemplateMeta } from "./templates/catalog.js";
import { esc, formatDate, occasionLabel, plural } from "../utils/format.js";
import { ui } from "../utils/ui.js";
import { statusBadge } from "./badge.js";
import { icon } from "./icons.js";

function coverMarkup(album, className) {
  const src = coverSrc(album, 900);
  if (!src) {
    return `<span class="${className} grid place-items-center bg-canvas text-mist">${icon("image", "h-5 w-5")}</span>`;
  }
  return `<img src="${esc(src)}" alt="" class="${className} object-cover" loading="lazy" decoding="async" />`;
}

function templateSwatch(meta, size = "h-6 w-8") {
  const { bg, ink, accent } = meta.swatch;
  return `<span class="relative ${size} shrink-0 overflow-hidden rounded-[5px] ring-1 ring-black/10" style="background:${bg}" aria-hidden="true"><span class="absolute inset-x-[18%] top-[22%] h-[30%] rounded-[2px]" style="background:${ink};opacity:.82"></span><span class="absolute bottom-[18%] left-[18%] h-[12%] w-[40%] rounded-full" style="background:${accent}"></span></span>`;
}

export function templateChip(album) {
  const meta = getTemplateMeta(album.templateId);
  return `<span class="inline-flex min-w-0 items-center gap-2">${templateSwatch(meta)}<span class="truncate text-xs font-medium text-ink">${esc(meta.name)}</span></span>`;
}

function subtitle(album) {
  const occasion = occasionLabel(album.occasion) || "Album";
  if (!album.customerName || album.customerName === album.name) return occasion;
  return `${album.customerName} · ${occasion}`;
}

export function albumGrid(albums) {
  if (!albums.length) return "";
  return `<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">${albums.map(gridCard).join("")}</div>`;
}

export function albumList(albums) {
  if (!albums.length) return "";
  return `<div class="${ui.card} divide-y divide-line">${albums.map(listRow).join("")}</div>`;
}

function gridCard(album) {
  const status = effectiveStatus(album);
  return `
    <article class="group relative ${ui.card} overflow-hidden">
      <a data-link href="/admin/albums/${album.id}/photos" class="block">
        <span class="relative block aspect-[4/3] overflow-hidden bg-canvas">
          ${coverMarkup(album, "h-full w-full transition duration-500 group-hover:scale-[1.03]")}
        </span>
        <span class="block p-4">
          <span class="flex items-start justify-between gap-3">
            <span class="min-w-0">
              <span class="block truncate text-[15px] font-semibold">${esc(album.name)}</span>
              <span class="mt-1 block truncate text-sm text-mist">${esc(subtitle(album))}</span>
            </span>
          </span>
          <span class="mt-4 flex items-center justify-between gap-3 text-xs text-mist">
            <span>${formatDate(album.shootingDate)}</span>
            <span>${plural(album.photos.length, "photo")}</span>
          </span>
        </span>
      </a>
      <div class="mx-4 flex items-center justify-between gap-3 border-t border-line py-3">
        ${templateChip(album)}
        <a data-link href="/admin/albums/${album.id}/template" class="shrink-0 text-xs font-semibold text-primary hover:underline">Đổi giao diện</a>
      </div>
      <span class="absolute left-3 top-3">${statusBadge(status)}</span>
      <button type="button" data-more="${album.id}" class="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-ink shadow-sm" aria-label="Thao tác album">
        ${icon("more-horizontal", "h-4 w-4")}
      </button>
    </article>`;
}

function listRow(album) {
  const status = effectiveStatus(album);
  return `
    <article class="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4">
      <a data-link href="/admin/albums/${album.id}/photos" class="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        ${coverMarkup(album, "h-16 w-16 shrink-0 rounded-xl")}
        <span class="min-w-0 flex-1">
          <span class="block truncate font-semibold">${esc(album.name)}</span>
          <span class="mt-0.5 block truncate text-sm text-mist">${esc(subtitle(album))}</span>
        </span>
        <span class="hidden w-28 shrink-0 text-sm text-mist md:block">${formatDate(album.shootingDate)}</span>
        <span class="hidden w-24 shrink-0 text-sm text-mist lg:block">${plural(album.photos.length, "photo")}</span>
        <span class="hidden w-44 shrink-0 xl:block">${templateChip(album)}</span>
        <span class="hidden sm:block">${statusBadge(status)}</span>
      </a>
      <button type="button" data-more="${album.id}" class="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-mist hover:bg-canvas hover:text-ink" aria-label="Thao tác album">
        ${icon("more-horizontal", "h-4 w-4")}
      </button>
    </article>`;
}
