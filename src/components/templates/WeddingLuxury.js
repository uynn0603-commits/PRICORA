import { photoSrc } from "../../data/media.js";
import { esc } from "../../utils/format.js";
import { bindGallery } from "../gallery/GalleryActions.js";
import { galleryFooter } from "../gallery/GalleryFooter.js";
import { frame } from "../gallery/GalleryGrid.js";
import { albumMeta, downloadAllButton } from "../gallery/GalleryHeader.js";
import { coverImage } from "../gallery/GalleryHero.js";
import { splitCouple } from "../gallery/model.js";
import { logoLockup } from "../logo.js";

const INK = "text-[#29251F]";
const ACCENT = "text-[#B99A72]";
const IMG_HOVER = "transition duration-[1200ms] ease-out group-hover:scale-[1.015]";

const outlineButton =
  "inline-flex h-10 items-center justify-center gap-2 border border-[#29251F]/25 px-4 text-[12px] font-medium uppercase tracking-[0.16em] text-[#29251F] transition hover:border-[#B99A72] hover:text-[#B99A72]";

function names(model) {
  const couple = splitCouple(model.customerName);
  if (!couple) return `<span class="block">${esc(model.customerName || model.title)}</span>`;
  return `
    <span class="block">${esc(couple[0])}</span>
    <span class="my-1 block font-playfair text-[0.55em] italic ${ACCENT}">&amp;</span>
    <span class="block">${esc(couple[1])}</span>`;
}

function divider() {
  return `
    <div class="mx-auto flex items-center justify-center gap-4 ${ACCENT}" aria-hidden="true">
      <span class="h-px w-14 bg-[#B99A72]/60"></span>
      <span class="h-1.5 w-1.5 rotate-45 border border-[#B99A72]"></span>
      <span class="h-px w-14 bg-[#B99A72]/60"></span>
    </div>`;
}

// Balanced rhythm: a wide frame, a pair, a centred portrait, then a pair again.
function gallery(model) {
  const pattern = ["full", "pair", "single", "pair"];
  const blocks = [];
  let index = 0;
  let step = 0;
  while (index < model.photos.length) {
    const kind = pattern[step % pattern.length];
    if (kind === "full") {
      blocks.push(frame(model, index, { ratio: 3 / 2, width: 2200, className: "bg-[#EAE5DC]", imgClass: IMG_HOVER }));
      index += 1;
    } else if (kind === "single") {
      blocks.push(
        `<div class="mx-auto max-w-[720px]">${frame(model, index, { ratio: 4 / 5, width: 1400, className: "bg-[#EAE5DC]", imgClass: IMG_HOVER })}</div>`,
      );
      index += 1;
    } else {
      const second = model.photos[index + 1]
        ? frame(model, index + 1, { ratio: 4 / 5, width: 1200, sizes: "50vw", className: "bg-[#EAE5DC]", imgClass: IMG_HOVER })
        : "";
      blocks.push(
        `<div class="grid grid-cols-2 gap-3 md:gap-8">${frame(model, index, { ratio: 4 / 5, width: 1200, sizes: "50vw", className: "bg-[#EAE5DC]", imgClass: IMG_HOVER })}${second}</div>`,
      );
      index += 2;
    }
    step += 1;
  }
  return blocks.join("");
}

export function render(model, { banner = "" } = {}) {
  const meta = albumMeta(model);
  const eyebrow = model.occasion === "Wedding" ? "Lễ cưới của" : model.occasionLabel || "Kỷ niệm";
  return `
    <div id="template-root" class="font-inter min-h-screen bg-[#FAF9F6] ${INK}">
      ${banner}
      <header class="sticky top-0 z-30 border-b border-[#EAE5DC] bg-[#FAF9F6]/95 backdrop-blur">
        <div class="mx-auto grid h-16 max-w-[1500px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 md:grid-cols-[1fr_auto_1fr] md:px-10">
          <a href="#" data-scroll="top" class="opacity-80 transition hover:opacity-100" aria-label="Lên đầu trang">${logoLockup({ size: 20, compact: true, mono: true })}</a>
          <p class="truncate text-center font-playfair text-[15px] italic md:text-base">${esc(model.title)}</p>
          <nav class="flex items-center justify-end gap-6">
            <a href="#gallery" data-scroll="gallery" class="hidden text-[12px] uppercase tracking-[0.16em] text-[#29251F]/70 transition hover:text-[#B99A72] sm:inline">Bộ ảnh</a>
            ${downloadAllButton(model, { className: outlineButton, label: "Tải cả album", short: "Tải về", iconClass: "h-3.5 w-3.5" })}
          </nav>
        </div>
      </header>

      <section class="mx-auto max-w-[1500px] px-3 pt-3 md:px-10 md:pt-10">
        <div class="relative h-[68svh] min-h-[420px] max-h-[940px] overflow-hidden bg-[#EAE5DC] md:h-[82vh]">
          ${coverImage(model, { width: 2400, ratio: 16 / 10, className: "absolute inset-0 h-full w-full" })}
        </div>
      </section>

      <section class="px-6 py-16 text-center md:py-28">
        <p class="text-[11px] font-medium uppercase tracking-[0.38em] ${ACCENT}">${esc(eyebrow)}</p>
        <h1 class="mt-7 font-playfair text-[44px] font-normal leading-[1.04] tracking-[-0.01em] sm:text-6xl md:text-7xl lg:text-[88px]">${names(model)}</h1>
        <div class="mt-10">${divider()}</div>
        <p class="mt-8 font-playfair text-lg italic md:text-xl">${esc(meta.date)}</p>
        <p class="mt-3 text-[11px] uppercase tracking-[0.3em] text-[#29251F]/55">${esc(meta.count)}</p>
        ${model.description ? `<p class="mx-auto mt-10 max-w-xl text-[15px] leading-8 text-[#29251F]/70">${esc(model.description)}</p>` : ""}
      </section>

      <section id="gallery" class="mx-auto max-w-[1500px] scroll-mt-20 space-y-3 px-3 pb-20 md:space-y-8 md:px-10 md:pb-32">
        ${model.photos.length ? gallery(model) : `<p class="py-20 text-center font-playfair italic text-[#29251F]/60">Ảnh sẽ sớm xuất hiện tại đây.</p>`}
      </section>

      ${
        model.settings.allowDownload && model.photos.length
          ? `<section class="border-t border-[#EAE5DC] px-6 py-20 text-center md:py-28">
              ${divider()}
              <h2 class="mt-8 font-playfair text-3xl md:text-4xl">Lưu giữ mọi khoảnh khắc</h2>
              <p class="mx-auto mt-4 max-w-md text-sm leading-7 text-[#29251F]/65">Tải trọn bộ ${esc(meta.count)} theo đúng thứ tự gốc.</p>
              <div class="mt-8">${downloadAllButton(model, { className: `${outlineButton} h-12 px-7`, label: "Tải cả album", short: "Tải cả album" })}</div>
            </section>`
          : ""
      }
      ${galleryFooter({ tone: "ivory" })}
    </div>`;
}

export function mount(model) {
  bindGallery(model, { lightbox: "ivory", pageBg: "#FAF9F6" });
}

export function thumbnail(model) {
  const src = (index, width = 360, ratio) => esc(photoSrc(model.photos[index], width, ratio));
  const couple = splitCouple(model.customerName) || [model.customerName, ""];
  const meta = albumMeta(model);
  return `
    <div class="flex h-full flex-col bg-[#FAF9F6] text-[#29251F]">
      <div class="flex items-center justify-between border-b border-[#EAE5DC] px-3 py-1.5 text-[6px] uppercase tracking-[0.2em]"><span class="font-semibold">Picora</span><span class="font-playfair normal-case italic tracking-normal">${esc(model.customerName)}</span><span>Bộ ảnh</span></div>
      <div class="px-2 pt-2"><img src="${esc(photoSrc(model.coverPhoto, 600, 2.6))}" alt="" class="aspect-[2.6/1] w-full object-cover" /></div>
      <div class="py-2.5 text-center">
        <p class="text-[5px] uppercase tracking-[0.3em] text-[#B99A72]">Lễ cưới của</p>
        <p class="mt-0.5 font-playfair text-[15px] leading-none">${esc(couple[0])} ${couple[1] ? `<span class="italic text-[#B99A72]">&amp;</span> ${esc(couple[1])}` : ""}</p>
        <p class="mt-1 font-playfair text-[6px] italic">${esc(meta.date)}</p>
      </div>
      <div class="grid grid-cols-2 gap-1.5 px-2 pb-2"><img src="${src(0, 300, 1.25)}" alt="" class="aspect-[5/4] w-full object-cover" /><img src="${src(1, 300, 1.25)}" alt="" class="aspect-[5/4] w-full object-cover" /></div>
    </div>`;
}
