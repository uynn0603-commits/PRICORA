import { photoSrc } from "../../data/media.js";
import { esc } from "../../utils/format.js";
import { onCleanup } from "../../utils/lifecycle.js";
import { bindGallery } from "../gallery/GalleryActions.js";
import { galleryFooter } from "../gallery/GalleryFooter.js";
import { frame } from "../gallery/GalleryGrid.js";
import { albumMeta, downloadAllButton } from "../gallery/GalleryHeader.js";
import { coverImage } from "../gallery/GalleryHero.js";
import { icon } from "../icons.js";
import { studioLockup } from "../logo.js";

const BATCH = 24;

const primaryButton =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[#7552F6] px-4 text-sm font-semibold text-white transition hover:bg-[#6340E8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7552F6] md:px-5";

const HOVER_OVERLAY = `<span class="pointer-events-none absolute inset-0 flex items-end justify-end bg-black/0 p-2.5 opacity-0 transition duration-300 group-hover:bg-black/10 group-hover:opacity-100"><span class="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-[#202124]">${icon("expand", "h-4 w-4")}</span></span>`;

function tiles(model, from, to) {
  let html = "";
  for (let index = from; index < Math.min(to, model.photos.length); index += 1) {
    html += `<figure>${frame(model, index, { width: 720, sizes: "(min-width: 1200px) 25vw, (min-width: 768px) 33vw, 50vw", className: "rounded-lg bg-[#F1F3F4]", imgClass: "transition duration-500 group-hover:scale-[1.02]", overlay: HOVER_OVERLAY })}</figure>`;
  }
  return html;
}

function chip(content) {
  return `<span class="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#E8EAED] px-3 text-[13px] font-medium text-[#3C4043]">${content}</span>`;
}

export function render(model, { banner = "" } = {}) {
  const meta = albumMeta(model);
  return `
    <div id="template-root" class="font-jakarta min-h-screen bg-white text-[#202124]">
      ${banner}
      <header class="sticky top-0 z-30 border-b border-[#E8EAED] bg-white/95 backdrop-blur">
        <div class="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 md:px-8">
          <a href="#" data-scroll="top" class="shrink-0" aria-label="Lên đầu trang">${studioLockup(model.studio, { size: 28, compact: true })}</a>
          <span class="hidden h-6 w-px bg-[#E8EAED] sm:block"></span>
          <div class="hidden min-w-0 flex-1 sm:block">
            <p class="truncate text-sm font-semibold">${esc(model.title)}</p>
            <p class="truncate text-xs text-[#5F6368]">${[meta.showCustomer ? model.customerName : "", meta.date].filter(Boolean).map(esc).join(" · ")}</p>
          </div>
          <span class="flex-1 sm:hidden"></span>
          ${downloadAllButton(model, { className: primaryButton, label: "Tải tất cả", short: "Tải về" })}
        </div>
      </header>

      <section class="mx-auto max-w-[1600px] px-3 pt-3 md:px-8 md:pt-6">
        <div class="relative h-[38vh] min-h-[240px] max-h-[520px] overflow-hidden rounded-2xl bg-[#F1F3F4] md:h-[46vh]">
          ${coverImage(model, { width: 2200, ratio: 2.6, className: "absolute inset-0 h-full w-full" })}
        </div>
        <div class="flex flex-col gap-5 py-6 md:flex-row md:items-end md:justify-between md:py-9">
          <div class="min-w-0 max-w-3xl">
            ${model.occasionLabel ? `<p class="text-sm font-semibold text-[#7552F6]">${esc(model.occasionLabel)}</p>` : ""}
            <h1 class="mt-1.5 text-[28px] font-bold leading-tight tracking-[-0.02em] md:text-[40px]">${esc(model.title)}</h1>
            ${model.description ? `<p class="mt-3 text-[15px] leading-relaxed text-[#5F6368]">${esc(model.description)}</p>` : ""}
          </div>
          <div class="flex shrink-0 flex-wrap gap-2">
            ${chip(`${icon("images", "h-3.5 w-3.5 text-[#7552F6]")} ${esc(meta.count)}`)}
            ${chip(`${icon("calendar", "h-3.5 w-3.5 text-[#7552F6]")} ${esc(meta.date)}`)}
            ${meta.showCustomer ? chip(`${icon("user-round", "h-3.5 w-3.5 text-[#7552F6]")} ${esc(model.customerName)}`) : ""}
          </div>
        </div>
      </section>

      <section id="gallery" class="mx-auto max-w-[1600px] scroll-mt-20 px-3 pb-16 md:px-8">
        ${
          model.photos.length
            ? `<div id="masonry" class="masonry-grid">${tiles(model, 0, BATCH)}</div><div id="masonry-more" class="h-px"></div>`
            : `<div class="rounded-2xl border border-dashed border-[#E8EAED] py-20 text-center text-sm text-[#5F6368]">Ảnh sẽ sớm xuất hiện tại đây.</div>`
        }
      </section>
      ${galleryFooter({ tone: "light", studio: model.studio })}
    </div>`;
}

export function mount(model) {
  bindGallery(model, { lightbox: "dark", pageBg: "#FFFFFF" });
  const grid = document.getElementById("masonry");
  const sentinel = document.getElementById("masonry-more");
  if (!grid || !sentinel || model.photos.length <= BATCH) return;
  let rendered = BATCH;
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      grid.insertAdjacentHTML("beforeend", tiles(model, rendered, rendered + BATCH));
      rendered += BATCH;
      if (rendered >= model.photos.length) observer.disconnect();
    },
    { rootMargin: "1200px 0px" },
  );
  observer.observe(sentinel);
  onCleanup(() => observer.disconnect());
}

export function thumbnail(model) {
  const columns = [[0, 3, 6], [1, 4, 7], [2, 5, 8]];
  return `
    <div class="flex h-full flex-col bg-white text-[#202124]">
      <div class="flex items-center justify-between border-b border-[#E8EAED] px-2.5 py-1.5"><span class="text-[6px] font-bold uppercase tracking-[0.18em]">Picora</span><span class="rounded-full bg-[#7552F6] px-1.5 py-0.5 text-[5px] font-semibold text-white">Tải tất cả</span></div>
      <div class="px-2 pt-1.5"><img src="${esc(photoSrc(model.coverPhoto, 500, 3.2))}" alt="" class="aspect-[3.2/1] w-full rounded object-cover" /></div>
      <div class="flex items-end justify-between px-2 py-1.5"><p class="text-[9px] font-bold leading-none">${esc(model.title)}</p><span class="rounded-full border border-[#E8EAED] px-1 text-[5px]">${model.photos.length} ảnh</span></div>
      <div class="grid flex-1 grid-cols-3 gap-1 overflow-hidden px-2">
        ${columns
          .map(
            (column) =>
              `<div class="space-y-1">${column
                .map((index) => {
                  const photo = model.photos[index];
                  return photo ? `<img src="${esc(photoSrc(photo, 140))}" alt="" class="w-full rounded-[2px] object-cover" style="aspect-ratio:${photo.w}/${photo.h}" />` : "";
                })
                .join("")}</div>`,
          )
          .join("")}
      </div>
    </div>`;
}
