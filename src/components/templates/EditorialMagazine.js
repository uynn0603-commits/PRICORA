import { photoSrc } from "../../data/media.js";
import { esc, formatDate } from "../../utils/format.js";
import { bindGallery } from "../gallery/GalleryActions.js";
import { galleryFooter } from "../gallery/GalleryFooter.js";
import { frame } from "../gallery/GalleryGrid.js";
import { albumMeta, downloadAllButton } from "../gallery/GalleryHeader.js";
import { coverImage } from "../gallery/GalleryHero.js";
import { pad } from "../gallery/model.js";
import { logoLockup } from "../logo.js";

const BG = "bg-[#F4F1EC]";
const ACCENT = "text-[#A18B76]";
const IMG = "transition duration-700 group-hover:scale-[1.02]";
const TILE = "bg-[#E6E0D7]";

const textButton =
  "inline-flex h-9 items-center gap-2 border-b border-[#222] text-[12px] font-medium uppercase tracking-[0.18em] text-[#222] transition hover:border-[#A18B76] hover:text-[#A18B76]";

function caption(model, index, extra = "") {
  return `
    <figcaption class="mt-3 flex items-baseline gap-3 text-[11px] uppercase tracking-[0.2em] text-[#222]/60">
      <span class="font-cormorant text-lg normal-case italic tracking-normal text-[#222]">N°${pad(index + 1)}</span>
      <span>${extra || `Khung ${pad(index + 1)} / ${pad(model.photos.length)}`}</span>
    </figcaption>`;
}

function titleMarkup(title) {
  const words = String(title).trim().split(/\s+/);
  if (words.length < 2) return esc(title);
  const cut = Math.ceil(words.length / 2);
  return `${esc(words.slice(0, cut).join(" "))} <em class="font-normal ${ACCENT}">${esc(words.slice(cut).join(" "))}</em>`;
}

// Each spread consumes a fixed number of frames and lays them out asymmetrically.
const SPREADS = [
  {
    size: 2,
    html: (model, i) => `
      <div class="grid gap-8 md:grid-cols-12 md:items-end md:gap-6">
        <figure class="md:col-span-7">${frame(model, i, { ratio: 4 / 5, width: 1400, className: TILE, imgClass: IMG })}${caption(model, i)}</figure>
        ${
          model.photos[i + 1]
            ? `<figure class="w-2/3 justify-self-end md:col-span-4 md:col-start-9 md:mb-28 md:w-full">${frame(model, i + 1, { ratio: 3 / 4, width: 900, className: TILE, imgClass: IMG })}${caption(model, i + 1)}</figure>`
            : ""
        }
      </div>`,
  },
  {
    size: 1,
    html: (model, i) => `
      <figure class="-mx-5 md:-mx-10">${frame(model, i, { ratio: 21 / 9, aspect: "aspect-[4/3] md:aspect-[21/9]", width: 2400, className: TILE, imgClass: IMG })}<div class="px-5 md:px-10">${caption(model, i, "Trang đôi")}</div></figure>`,
  },
  {
    size: 3,
    html: (model, i) => `
      <div class="grid grid-cols-3 gap-2 md:gap-6">
        ${[0, 1, 2]
          .filter((offset) => model.photos[i + offset])
          .map(
            (offset) =>
              `<figure class="${offset === 1 ? "mt-8 md:mt-20" : ""}">${frame(model, i + offset, { ratio: 2 / 3, width: 800, className: TILE, imgClass: IMG })}<p class="mt-2 font-cormorant text-base italic md:text-lg">N°${pad(i + offset + 1)}</p></figure>`,
          )
          .join("")}
      </div>`,
  },
  {
    size: 1,
    html: (model, i) => `
      <div class="grid gap-6 md:grid-cols-12 md:items-center md:gap-10">
        <div class="md:col-span-4">
          <p class="font-cormorant text-[88px] font-light leading-none ${ACCENT} md:text-[140px]">${pad(i + 1)}</p>
          <p class="mt-4 max-w-xs font-cormorant text-2xl italic leading-snug md:text-[28px]">${esc(model.title)}</p>
          <p class="mt-3 text-[11px] uppercase tracking-[0.2em] text-[#222]/55">${esc(model.customerName)} · ${esc(formatDate(model.shootingDate))}</p>
        </div>
        <figure class="md:col-span-8">${frame(model, i, { ratio: 3 / 2, width: 1800, className: TILE, imgClass: IMG })}</figure>
      </div>`,
  },
];

function spreads(model, start) {
  const html = [];
  let index = start;
  let step = 0;
  while (index < model.photos.length) {
    const spread = SPREADS[step % SPREADS.length];
    html.push(spread.html(model, index));
    index += spread.size;
    step += 1;
  }
  return html.join("");
}

function contactSheet(model) {
  return model.photos
    .map(
      (photo, index) => `
        <button type="button" data-open="${index}" class="group text-left" aria-label="Mở ảnh ${index + 1}">
          <span class="block aspect-square overflow-hidden ${TILE}"><img src="${esc(photoSrc(photo, 240, 1))}" alt="" loading="lazy" class="h-full w-full object-cover grayscale transition duration-500 group-hover:grayscale-0" /></span>
          <span class="mt-1.5 block font-cormorant text-sm italic">${pad(index + 1)}</span>
        </button>`,
    )
    .join("");
}

export function render(model, { banner = "" } = {}) {
  const meta = albumMeta(model);
  // With enough frames the first one becomes the hero inset, so the spreads skip it.
  const inset = model.photos.length > 3 ? 0 : -1;
  const start = inset + 1;
  return `
    <div id="template-root" class="font-inter min-h-screen ${BG} text-[#222]">
      ${banner}
      <header class="sticky top-0 z-30 bg-[#F4F1EC]/95 backdrop-blur">
        <div class="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-5 md:px-10">
          <a href="#" data-scroll="top" aria-label="Lên đầu trang">${logoLockup({ size: 20, compact: true, mono: true })}</a>
          <nav class="hidden items-center gap-8 text-[12px] uppercase tracking-[0.18em] md:flex">
            <a href="#story" data-scroll="story" class="transition hover:text-[#A18B76]">Câu chuyện</a>
            <a href="#gallery" data-scroll="gallery" class="transition hover:text-[#A18B76]">Bộ ảnh</a>
            <a href="#index" data-scroll="index" class="transition hover:text-[#A18B76]">Mục lục</a>
          </nav>
          ${downloadAllButton(model, { className: textButton, label: "Tải cả album", short: "Tải về", iconClass: "h-3.5 w-3.5" })}
        </div>
        <div class="mx-auto max-w-[1440px] px-5 md:px-10">
          <div class="flex items-center justify-between gap-4 border-y border-[#222] py-2 text-[10px] uppercase tracking-[0.24em] md:text-[11px]">
            <span>Số N°${esc(meta.year.slice(2) || "01")}</span>
            <span class="hidden truncate font-cormorant text-sm normal-case italic tracking-normal sm:block">${esc(model.title)}</span>
            <span>${esc(model.occasionLabel || "Ấn bản")} · ${model.photos.length} khung hình</span>
          </div>
        </div>
      </header>

      <section id="story" class="mx-auto grid max-w-[1440px] scroll-mt-28 gap-10 px-5 pb-20 pt-10 md:grid-cols-12 md:gap-8 md:px-10 md:pb-32 md:pt-16">
        <div class="flex flex-col md:col-span-5 md:pr-4">
          <p class="text-[11px] uppercase tracking-[0.3em] ${ACCENT}">${esc(model.customerName)} — ${esc(meta.year)}</p>
          <h1 class="mt-6 font-cormorant text-[60px] font-light leading-[0.88] tracking-[-0.02em] sm:text-[84px] lg:text-[118px]">${titleMarkup(model.title)}</h1>
          ${
            model.description
              ? `<p class="mt-10 max-w-sm text-[15px] leading-7 text-[#222]/75 first-letter:float-left first-letter:mr-2 first-letter:font-cormorant first-letter:text-[64px] first-letter:leading-[0.8] first-letter:text-[#222]">${esc(model.description)}</p>`
              : ""
          }
          <dl class="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-[#222]/20 pt-6 text-sm md:mt-auto">
            <div><dt class="text-[10px] uppercase tracking-[0.24em] text-[#222]/55">Nhân vật</dt><dd class="mt-1 font-cormorant text-xl">${esc(model.customerName)}</dd></div>
            <div><dt class="text-[10px] uppercase tracking-[0.24em] text-[#222]/55">Ngày chụp</dt><dd class="mt-1 font-cormorant text-xl">${esc(meta.date)}</dd></div>
            <div><dt class="text-[10px] uppercase tracking-[0.24em] text-[#222]/55">Số khung hình</dt><dd class="mt-1 font-cormorant text-xl">${model.photos.length}</dd></div>
            <div><dt class="text-[10px] uppercase tracking-[0.24em] text-[#222]/55">Chủ đề</dt><dd class="mt-1 font-cormorant text-xl">${esc(model.occasionLabel || "Portfolio")}</dd></div>
          </dl>
        </div>
        <div class="relative md:col-span-7">
          <div class="relative ml-auto aspect-[4/5] w-[88%] overflow-hidden ${TILE}">
            ${coverImage(model, { width: 1600, ratio: 4 / 5, className: "absolute inset-0 h-full w-full" })}
          </div>
          ${
            inset >= 0
              ? `<div class="absolute -bottom-10 left-0 w-[40%] border-[6px] border-[#F4F1EC] md:-bottom-14 md:border-[10px]">${frame(model, inset, { ratio: 3 / 4, width: 700, className: TILE, imgClass: IMG })}</div>`
              : ""
          }
          <p class="mt-3 pl-[44%] text-right text-[10px] uppercase tracking-[0.24em] text-[#222]/55">Trang bìa — ${esc(model.customerName)}</p>
        </div>
      </section>

      <section id="gallery" class="mx-auto max-w-[1440px] scroll-mt-28 px-5 md:px-10">
        <div class="flex items-end justify-between border-b border-[#222] pb-3">
          <h2 class="font-cormorant text-4xl font-light italic md:text-5xl">Tuyển tập</h2>
          <p class="text-[11px] uppercase tracking-[0.24em]">${model.photos.length} khung hình</p>
        </div>
        <div class="space-y-20 py-14 md:space-y-32 md:py-24">
          ${model.photos.length ? spreads(model, start) : `<p class="font-cormorant text-2xl italic text-[#222]/60">Ảnh sẽ sớm xuất hiện tại đây.</p>`}
        </div>
      </section>

      ${
        model.photos.length
          ? `<section id="index" class="mx-auto max-w-[1440px] scroll-mt-28 px-5 pb-20 md:px-10 md:pb-28">
              <div class="flex items-end justify-between border-b border-[#222] pb-3">
                <h2 class="font-cormorant text-4xl font-light italic md:text-5xl">Mục lục</h2>
                ${downloadAllButton(model, { className: textButton, label: "Tải tất cả ảnh", short: "Tải về" })}
              </div>
              <div class="mt-8 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-9">${contactSheet(model)}</div>
            </section>`
          : ""
      }
      ${galleryFooter({ tone: "paper" })}
    </div>`;
}

export function mount(model) {
  bindGallery(model, { lightbox: "paper", pageBg: "#F4F1EC" });
}

export function thumbnail(model) {
  const src = (index, width, ratio) => esc(photoSrc(model.photos[index], width, ratio));
  return `
    <div class="flex h-full flex-col bg-[#F4F1EC] px-3 py-2 text-[#222]">
      <div class="flex items-center justify-between border-b border-[#222] pb-1 text-[5px] uppercase tracking-[0.25em]"><span class="font-semibold">Picora</span><span>Câu chuyện · Bộ ảnh · Mục lục</span></div>
      <div class="mt-2 grid flex-1 grid-cols-12 gap-2">
        <div class="col-span-5 flex flex-col">
          <p class="text-[4.5px] uppercase tracking-[0.3em] text-[#A18B76]">${esc(model.customerName)}</p>
          <p class="mt-1 font-cormorant text-[22px] font-light leading-[0.85]">${titleMarkup(model.title)}</p>
          <div class="mt-auto grid grid-cols-2 gap-1 border-t border-[#222]/20 pt-1 font-cormorant text-[6px]"><span>${esc(albumMeta(model).date)}</span><span>${model.photos.length} khung hình</span></div>
        </div>
        <div class="relative col-span-7">
          <img src="${esc(photoSrc(model.coverPhoto, 360, 0.8))}" alt="" class="ml-auto aspect-[4/5] w-[86%] object-cover" />
          <img src="${src(0, 160, 0.75)}" alt="" class="absolute -bottom-1 left-0 aspect-[3/4] w-[38%] border-2 border-[#F4F1EC] object-cover" />
        </div>
      </div>
      <div class="mt-2 grid grid-cols-3 gap-1"><img src="${src(2, 140, 1.4)}" alt="" class="aspect-[7/5] w-full object-cover" /><img src="${src(3, 140, 1.4)}" alt="" class="mt-1 aspect-[7/5] w-full object-cover" /><img src="${src(4, 140, 1.4)}" alt="" class="aspect-[7/5] w-full object-cover" /></div>
    </div>`;
}
