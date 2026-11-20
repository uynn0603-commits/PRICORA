"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { photoSrc } from "@/lib/media";
import { GalleryRoot, ScrollLink } from "../gallery/GalleryActions";
import { GalleryFooter } from "../gallery/GalleryFooter";
import { fitsWide, Frame } from "../gallery/GalleryGrid";
import { albumMeta, DownloadAllButton } from "../gallery/GalleryHeader";
import { CoverImage } from "../gallery/GalleryHero";
import { pad, type GalleryModel } from "../gallery/model";
import { Icon } from "../ui/Icon";
import { StudioLockup } from "../ui/Logo";
import type { TemplateProps } from "./types";

const GOLD = "text-[#C8A96A]";
const MUTED = "text-[#A1A1A1]";
const IMG = "transition duration-[900ms] ease-out group-hover:scale-[1.04] group-hover:brightness-110";

const goldButton =
  "inline-flex h-10 items-center gap-2 border border-[#C8A96A]/70 px-4 text-[11px] font-medium uppercase tracking-[0.22em] text-[#C8A96A] transition hover:bg-[#C8A96A] hover:text-[#111]";

// Six portrait frames, then one widescreen scene that spans the row. A portrait scene
// keeps the full row, framed upright in the middle, so the grid stays aligned.
function Scenes({ model }: { model: GalleryModel }) {
  return (
    <>
      {model.photos.map((photo, index) =>
        index % 7 === 6 ? (
          <figure key={photo.id} className="sm:col-span-2 lg:col-span-3">
            {fitsWide(photo) ? (
              <Frame index={index} ratio={2.39} aspect="aspect-[16/10] sm:aspect-[2.39/1]" width={2400} className="bg-[#1B1B1B]" imgClass={IMG} />
            ) : (
              <div className="mx-auto max-w-[560px]">
                <Frame index={index} ratio={4 / 5} width={1200} sizes="(min-width: 640px) 560px, 100vw" className="bg-[#1B1B1B]" imgClass={IMG} />
              </div>
            )}
            <figcaption className={`mt-4 flex items-center justify-between text-[11px] uppercase tracking-[0.3em] ${MUTED}`}>
              <span>Cảnh {pad(index + 1)}</span>
              <span className="h-px flex-1 mx-6 bg-white/10" />
              <span>{model.title}</span>
            </figcaption>
          </figure>
        ) : (
          <figure key={photo.id}>
            <Frame
              index={index}
              ratio={4 / 5}
              width={1000}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="bg-[#1B1B1B]"
              imgClass={IMG}
            />
          </figure>
        ),
      )}
    </>
  );
}

// The header turns solid once the full-screen opening has mostly scrolled away.
function useSolidHeader() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const sync = () => setSolid(window.scrollY > window.innerHeight * 0.6);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);
  return solid;
}

export function DarkCinematic({ model, banner }: TemplateProps) {
  const meta = albumMeta(model);
  const solid = useSolidHeader();
  return (
    <GalleryRoot model={model} lightbox="noir" pageBg="#111111" className="font-inter min-h-screen bg-[#111111] text-white">
      {banner}
      <header
        id="cine-header"
        className={`sticky top-0 z-30 -mb-16 border-b transition-colors duration-500 ${solid ? "bg-[#111111]/92 backdrop-blur border-white/10" : "border-transparent"}`}
      >
        <div className="mx-auto grid h-16 max-w-[1600px] grid-cols-[auto_1fr_auto] items-center gap-4 px-5 md:px-12">
          <ScrollLink to="top" label="Lên đầu trang">
            <StudioLockup studio={model.studio} size={20} compact mono tone="dark" />
          </ScrollLink>
          <p className="hidden truncate text-center text-[11px] uppercase tracking-[0.34em] text-white/75 md:block">{model.title}</p>
          <span className="md:hidden" />
          <DownloadAllButton className={goldButton} label="Tải về" short="Tải về" iconClass="h-3.5 w-3.5" />
        </div>
      </header>

      <section className="relative h-[100svh] min-h-[560px] overflow-hidden bg-[#0B0B0B]">
        <div className="cinematic-in absolute inset-0">
          <CoverImage model={model} width={2600} ratio={16 / 9} className="h-full w-full" />
        </div>
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#111111] via-[#111111]/50 to-transparent" />
        <div className="rise-in absolute inset-x-0 bottom-0 mx-auto max-w-[1600px] px-5 pb-8 md:px-12 md:pb-12">
          <p className={`text-[11px] uppercase tracking-[0.42em] ${GOLD}`}>{model.occasionLabel || "Một thước phim"}</p>
          <h1 className="mt-4 max-w-5xl font-cormorant text-[52px] font-light leading-[0.92] tracking-[-0.01em] sm:text-[76px] lg:text-[112px]">{model.title}</h1>
          <dl className="mt-8 grid grid-cols-2 gap-5 border-t border-white/15 pt-5 md:mt-12 md:grid-cols-4">
            <div>
              <dt className={`text-[10px] uppercase tracking-[0.3em] ${MUTED}`}>Nhân vật chính</dt>
              <dd className="mt-1.5 font-cormorant text-xl">{model.customerName}</dd>
            </div>
            <div>
              <dt className={`text-[10px] uppercase tracking-[0.3em] ${MUTED}`}>Ngày</dt>
              <dd className="mt-1.5 font-cormorant text-xl">{meta.date}</dd>
            </div>
            <div>
              <dt className={`text-[10px] uppercase tracking-[0.3em] ${MUTED}`}>Khung hình</dt>
              <dd className="mt-1.5 font-cormorant text-xl">{model.photoCount}</dd>
            </div>
            <div className="flex items-end md:justify-end">
              <ScrollLink to="gallery" className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/80 transition hover:text-[#C8A96A]">
                <Icon name="arrow-down" className="h-3.5 w-3.5" /> Bắt đầu
              </ScrollLink>
            </div>
          </dl>
        </div>
      </section>

      <section className="bg-[#1B1B1B] px-6 py-20 text-center md:py-32">
        <p className={`text-[11px] uppercase tracking-[0.42em] ${GOLD}`}>Mở đầu</p>
        <p className="mx-auto mt-8 max-w-3xl font-cormorant text-[26px] font-light italic leading-snug text-white/90 md:text-[40px]">
          {model.description || `${model.customerName} — ${meta.date}`}
        </p>
        <p className={`mt-8 text-[11px] uppercase tracking-[0.3em] ${MUTED}`}>{meta.count}</p>
      </section>

      <section id="gallery" className="mx-auto max-w-[1600px] scroll-mt-16 px-4 py-16 md:px-12 md:py-28">
        {model.photos.length ? (
          <div className="grid gap-4 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
            <Scenes model={model} />
          </div>
        ) : (
          <p className={`py-20 text-center font-cormorant text-2xl italic ${MUTED}`}>Thước phim vẫn đang được hoàn thiện.</p>
        )}
      </section>

      <section className="px-6 pb-24 text-center md:pb-32">
        <p className="font-cormorant text-6xl font-light italic md:text-7xl">Hết.</p>
        <p className={`mt-4 text-[11px] uppercase tracking-[0.3em] ${MUTED}`}>
          {model.customerName} · {meta.year}
        </p>
        <div className="mt-10 flex justify-center">
          <DownloadAllButton className={`${goldButton} h-12 px-7`} label="Tải cả album" short="Tải cả album" />
        </div>
      </section>
      <GalleryFooter tone="dark" studio={model.studio} />
    </GalleryRoot>
  );
}

export function DarkCinematicThumbnail({ model }: { model: GalleryModel }) {
  const src = (index: number) => photoSrc(model.photos[index], 160, 0.8);
  return (
    <div className="flex h-full flex-col bg-[#111] text-white">
      <div className="relative h-[62%] overflow-hidden">
        <img src={photoSrc(model.coverPhoto, 560, 1.6)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-black/30 to-black/20" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-2.5 py-1.5 text-[5.5px] uppercase tracking-[0.25em]">
          <span className="font-semibold">Picora</span>
          <span className="border border-[#C8A96A]/70 px-1 py-0.5 text-[#C8A96A]">Tải về</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 px-2.5 pb-1.5">
          <p className="text-[4.5px] uppercase tracking-[0.35em] text-[#C8A96A]">{model.occasionLabel}</p>
          <p className="font-cormorant text-[17px] font-light leading-none">{model.customerName}</p>
          <div className="mt-1 flex gap-3 border-t border-white/15 pt-0.5 text-[4.5px] uppercase tracking-[0.2em] text-[#A1A1A1]">
            <span>{albumMeta(model).date}</span>
            <span>{model.photoCount} khung hình</span>
          </div>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-1 px-2.5 py-2">
        <img src={src(0)} alt="" className="h-full w-full object-cover" />
        <img src={src(1)} alt="" className="h-full w-full object-cover" />
        <img src={src(2)} alt="" className="h-full w-full object-cover" />
      </div>
    </div>
  );
}
