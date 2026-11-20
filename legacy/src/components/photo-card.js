import { photoSrc } from "../data/media.js";
import { esc, formatBytes, formatDate } from "../utils/format.js";
import { icon } from "./icons.js";

export function photoCard(photo, album, selected) {
  const src = photoSrc(photo, 700);
  const isCover = album.coverId === photo.id || (!album.coverId && !album.coverDataUrl && album.photos[0]?.id === photo.id);
  const frame = selected ? "border-primary ring-2 ring-primary/25" : "border-line";
  return `
    <article data-photo="${photo.id}" class="group">
      <div data-frame class="relative aspect-square overflow-hidden rounded-xl border ${frame} bg-canvas">
        ${
          src
            ? `<img src="${esc(src)}" alt="" class="h-full w-full object-cover" loading="lazy" decoding="async" draggable="false" />`
            : `<div class="flex h-full flex-col items-center justify-center gap-2 px-3 text-center text-mist">${icon("image", "h-5 w-5")}<span class="text-[11px]">Ảnh xem trước đã mất sau khi tải lại</span></div>`
        }
        <label class="absolute left-2 top-2 z-10 cursor-pointer">
          <input type="checkbox" data-check value="${photo.id}" ${selected ? "checked" : ""} class="peer sr-only" />
          <span class="grid h-6 w-6 place-items-center rounded-md ${selected ? "bg-primary text-white" : "border border-white bg-ink/30 text-transparent"}">
            ${icon("check", "h-3.5 w-3.5")}
          </span>
        </label>
        ${isCover ? '<span class="absolute right-2 top-2 z-10 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink">Ảnh bìa</span>' : ""}
        <button type="button" data-preview="${photo.id}" class="absolute inset-0 z-[1]" aria-label="Xem ${esc(photo.name)}"></button>
      </div>
      <div class="mt-2 flex items-start gap-2">
        <div class="min-w-0 flex-1">
          <p class="truncate text-[13px] font-medium">${esc(photo.name)}</p>
          <p class="text-[12px] text-mist">${formatBytes(photo.size)} · ${formatDate(photo.uploadedAt)}</p>
        </div>
        <button type="button" data-drag draggable="true" class="mt-0.5 cursor-grab text-mist active:cursor-grabbing" aria-label="Kéo để sắp xếp">${icon("grip-vertical", "h-4 w-4")}</button>
      </div>
    </article>`;
}

export function uploadRow(item) {
  const width = Math.round((item.progress || 0) * 100);
  const tone =
    item.status === "failed" ? "text-rose-600" : item.status === "success" ? "text-emerald-600" : "text-primary";
  const label =
    item.status === "failed" ? item.error : item.status === "success" ? "Đã tải lên" : `Đang tải ${width}%`;
  return `
    <li class="rounded-xl border border-line bg-white px-3 py-2.5">
      <div class="flex items-center justify-between gap-3">
        <p class="min-w-0 truncate text-sm font-medium">${esc(item.name)}</p>
        <p class="shrink-0 text-xs font-semibold ${tone}">${label}</p>
      </div>
      <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div class="h-full rounded-full ${item.status === "failed" ? "bg-rose-500" : "bg-primary"}" style="width:${item.status === "failed" ? 100 : width}%"></div>
      </div>
    </li>`;
}
