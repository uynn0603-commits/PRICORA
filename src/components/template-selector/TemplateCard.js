import { getDemoAlbum } from "../../data/template-demos.js";
import { esc } from "../../utils/format.js";
import { ui } from "../../utils/ui.js";
import { toGalleryModel } from "../gallery/model.js";
import { icon } from "../icons.js";
import { getRenderer } from "../templates/index.js";

const thumbs = new Map();

export function templateThumbnail(templateId) {
  if (!thumbs.has(templateId)) {
    const demo = getDemoAlbum(templateId);
    thumbs.set(templateId, demo ? getRenderer(templateId).thumbnail(toGalleryModel(demo)) : "");
  }
  return thumbs.get(templateId);
}

export function templateCard(meta, { selected = false, suggested = false, current = false, selectLabel = "Chọn giao diện" } = {}) {
  const ring = selected
    ? "border-primary shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand-primary)_14%,transparent)]"
    : "border-line hover:border-primary/40";
  return `
    <article data-template-card="${meta.id}" class="relative flex flex-col overflow-hidden rounded-2xl border-2 bg-white transition ${ring}">
      ${
        selected
          ? `<span class="absolute right-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-primary text-white shadow-sm" aria-hidden="true">${icon("check", "h-4 w-4")}</span>`
          : ""
      }
      <button type="button" data-template-preview="${meta.id}" class="block aspect-[4/3] overflow-hidden border-b border-line text-left" aria-label="Xem trước ${esc(meta.name)}">
        <div class="pointer-events-none h-full select-none transition duration-500 hover:scale-[1.01]">${templateThumbnail(meta.id)}</div>
      </button>
      <div class="flex flex-1 flex-col p-4">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="font-semibold">${esc(meta.name)}</h3>
          ${current ? `<span class="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">Đang dùng</span>` : ""}
          ${suggested && !current ? `<span class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">${icon("sparkles", "h-3 w-3")} Gợi ý</span>` : ""}
        </div>
        <p class="mt-1.5 text-sm leading-relaxed text-mist">${esc(meta.description)}</p>
        <div class="mt-3 flex flex-wrap gap-1.5">
          ${meta.style.map((tag) => `<span class="rounded-md bg-canvas px-2 py-1 text-[11px] font-medium text-ink/80">${esc(tag)}</span>`).join("")}
        </div>
        <p class="mt-3 text-xs text-mist">Phù hợp: <span class="text-ink">${meta.bestFor.map(esc).join(", ")}</span></p>
        <div class="mt-auto grid grid-cols-2 gap-2 pt-4">
          <button type="button" data-template-preview="${meta.id}" class="${ui.secondary} h-10 whitespace-nowrap px-2 text-[13px]">${icon("eye", "h-4 w-4")} Xem trước</button>
          <button type="button" data-template-select="${meta.id}" class="${selected ? `${ui.secondary} border-primary text-primary` : ui.primary} h-10 whitespace-nowrap px-2 text-[13px]" aria-pressed="${selected}">
            ${selected ? `${icon("check", "h-4 w-4")} Đã chọn` : esc(selectLabel)}
          </button>
        </div>
      </div>
    </article>`;
}
