import { photoSrc } from "../../data/media.js";
import { esc } from "../../utils/format.js";
import { onCleanup } from "../../utils/lifecycle.js";
import { bindGallery } from "../gallery/GalleryActions.js";
import { galleryFooter } from "../gallery/GalleryFooter.js";
import { frame } from "../gallery/GalleryGrid.js";
import { albumMeta, downloadAllButton } from "../gallery/GalleryHeader.js";
import { coverImage } from "../gallery/GalleryHero.js";
import { pad } from "../gallery/model.js";
import { icon } from "../icons.js";
import { studioLockup } from "../logo.js";

const GOLD = "text-[#C8A96A]";
const MUTED = "text-[#A1A1A1]";
const IMG = "transition duration-[900ms] ease-out group-hover:scale-[1.04] group-hover:brightness-110";

const goldButton =
  "inline-flex h-10 items-center gap-2 border border-[#C8A96A]/70 px-4 text-[11px] font-medium uppercase tracking-[0.22em] text-[#C8A96A] transition hover:bg-[#C8A96A] hover:text-[#111]";

// Six portrait frames, then one widescreen scene that spans the row.
function scenes(model) {
  return model.photos
    .map((_, index) => {
      if (index % 7 === 6) {
        return `
          <figure class="sm:col-span-2 lg:col-span-3">
            ${frame(model, index, { ratio: 2.39, aspect: "aspect-[16/10] sm:aspect-[2.39/1]", width: 2400, className: "bg-[#1B1B1B]", imgClass: IMG })}
            <figcaption class="mt-4 flex items-center justify-between text-[11px] uppercase tracking-[0.3em] ${MUTED}">
              <span>Cảnh ${pad(index + 1)}</span><span class="h-px flex-1 mx-6 bg-white/10"></span><span>${esc(model.title)}</span>
            </figcaption>
          </figure>`;
      }
      return `<figure>${frame(model, index, { ratio: 4 / 5, width: 1000, sizes: "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw", className: "bg-[#1B1B1B]", imgClass: IMG })}</figure>`;
    })
    .join("");
}

export function render(model, { banner = "" } = {}) {
  const meta = albumMeta(model);
  return `
    <div id="template-root" class="font-inter min-h-screen bg-[#111111] text-white">
      ${banner}
      <header id="cine-header" class="sticky top-0 z-30 -mb-16 border-b border-transparent transition-colors duration-500">
        <div class="mx-auto grid h-16 max-w-[1600px] grid-cols-[auto_1fr_auto] items-center gap-4 px-5 md:px-12">
          <a href="#" data-scroll="top" aria-label="Lên đầu trang">${studioLockup(model.studio, { size: 20, compact: true, mono: true, tone: "dark" })}</a>
          <p class="hidden truncate text-center text-[11px] uppercase tracking-[0.34em] text-white/75 md:block">${esc(model.title)}</p>
          <span class="md:hidden"></span>
          ${downloadAllButton(model, { className: goldButton, label: "Tải về", short: "Tải về", iconClass: "h-3.5 w-3.5" })}
        </div>
      </header>

      <section class="relative h-[100svh] min-h-[560px] overflow-hidden bg-[#0B0B0B]">
        <div class="cinematic-in absolute inset-0">${coverImage(model, { width: 2600, ratio: 16 / 9, className: "h-full w-full" })}</div>
        <div class="absolute inset-0 bg-black/35"></div>
        <div class="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#111111] via-[#111111]/50 to-transparent"></div>
        <div class="rise-in absolute inset-x-0 bottom-0 mx-auto max-w-[1600px] px-5 pb-8 md:px-12 md:pb-12">
          <p class="text-[11px] uppercase tracking-[0.42em] ${GOLD}">${esc(model.occasionLabel || "Một thước phim")}</p>
          <h1 class="mt-4 max-w-5xl font-cormorant text-[52px] font-light leading-[0.92] tracking-[-0.01em] sm:text-[76px] lg:text-[112px]">${esc(model.title)}</h1>
          <dl class="mt-8 grid grid-cols-2 gap-5 border-t border-white/15 pt-5 md:mt-12 md:grid-cols-4">
            <div><dt class="text-[10px] uppercase tracking-[0.3em] ${MUTED}">Nhân vật chính</dt><dd class="mt-1.5 font-cormorant text-xl">${esc(model.customerName)}</dd></div>
            <div><dt class="text-[10px] uppercase tracking-[0.3em] ${MUTED}">Ngày</dt><dd class="mt-1.5 font-cormorant text-xl">${esc(meta.date)}</dd></div>
            <div><dt class="text-[10px] uppercase tracking-[0.3em] ${MUTED}">Khung hình</dt><dd class="mt-1.5 font-cormorant text-xl">${model.photos.length}</dd></div>
            <div class="flex items-end md:justify-end">
              <a href="#gallery" data-scroll="gallery" class="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/80 transition hover:text-[#C8A96A]">${icon("arrow-down", "h-3.5 w-3.5")} Bắt đầu</a>
            </div>
          </dl>
        </div>
      </section>

      <section class="bg-[#1B1B1B] px-6 py-20 text-center md:py-32">
        <p class="text-[11px] uppercase tracking-[0.42em] ${GOLD}">Mở đầu</p>
        <p class="mx-auto mt-8 max-w-3xl font-cormorant text-[26px] font-light italic leading-snug text-white/90 md:text-[40px]">${esc(model.description || `${model.customerName} — ${meta.date}`)}</p>
        <p class="mt-8 text-[11px] uppercase tracking-[0.3em] ${MUTED}">${esc(meta.count)}</p>
      </section>

      <section id="gallery" class="mx-auto max-w-[1600px] scroll-mt-16 px-4 py-16 md:px-12 md:py-28">
        ${
          model.photos.length
            ? `<div class="grid gap-4 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">${scenes(model)}</div>`
            : `<p class="py-20 text-center font-cormorant text-2xl italic ${MUTED}">Thước phim vẫn đang được hoàn thiện.</p>`
        }
      </section>

      <section class="px-6 pb-24 text-center md:pb-32">
        <p class="font-cormorant text-6xl font-light italic md:text-7xl">Hết.</p>
        <p class="mt-4 text-[11px] uppercase tracking-[0.3em] ${MUTED}">${esc(model.customerName)} · ${esc(meta.year)}</p>
        <div class="mt-10 flex justify-center">${downloadAllButton(model, { className: `${goldButton} h-12 px-7`, label: "Tải cả album", short: "Tải cả album" })}</div>
      </section>
      ${galleryFooter({ tone: "dark", studio: model.studio })}
    </div>`;
}

export function mount(model) {
  bindGallery(model, { lightbox: "noir", pageBg: "#111111" });
  const header = document.getElementById("cine-header");
  if (!header) return;
  const solid = ["bg-[#111111]/92", "backdrop-blur", "border-white/10"];
  const sync = () => {
    const on = window.scrollY > window.innerHeight * 0.6;
    solid.forEach((name) => header.classList.toggle(name, on));
    header.classList.toggle("border-transparent", !on);
  };
  sync();
  window.addEventListener("scroll", sync, { passive: true });
  onCleanup(() => window.removeEventListener("scroll", sync));
}

export function thumbnail(model) {
  const src = (index) => esc(photoSrc(model.photos[index], 160, 0.8));
  return `
    <div class="flex h-full flex-col bg-[#111] text-white">
      <div class="relative h-[62%] overflow-hidden">
        <img src="${esc(photoSrc(model.coverPhoto, 560, 1.6))}" alt="" class="absolute inset-0 h-full w-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-t from-[#111] via-black/30 to-black/20"></div>
        <div class="absolute inset-x-0 top-0 flex items-center justify-between px-2.5 py-1.5 text-[5.5px] uppercase tracking-[0.25em]"><span class="font-semibold">Picora</span><span class="border border-[#C8A96A]/70 px-1 py-0.5 text-[#C8A96A]">Tải về</span></div>
        <div class="absolute inset-x-0 bottom-0 px-2.5 pb-1.5">
          <p class="text-[4.5px] uppercase tracking-[0.35em] text-[#C8A96A]">${esc(model.occasionLabel)}</p>
          <p class="font-cormorant text-[17px] font-light leading-none">${esc(model.customerName)}</p>
          <div class="mt-1 flex gap-3 border-t border-white/15 pt-0.5 text-[4.5px] uppercase tracking-[0.2em] text-[#A1A1A1]"><span>${esc(albumMeta(model).date)}</span><span>${model.photos.length} khung hình</span></div>
        </div>
      </div>
      <div class="grid flex-1 grid-cols-3 gap-1 px-2.5 py-2"><img src="${src(0)}" alt="" class="h-full w-full object-cover" /><img src="${src(1)}" alt="" class="h-full w-full object-cover" /><img src="${src(2)}" alt="" class="h-full w-full object-cover" /></div>
    </div>`;
}
