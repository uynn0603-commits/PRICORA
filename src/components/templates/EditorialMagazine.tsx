"use client";

/* eslint-disable @next/next/no-img-element */
import { Fragment, type ReactNode } from "react";
import { formatDate } from "@/lib/format";
import { photoSrc } from "@/lib/media";
import { GalleryRoot, ScrollLink, useGallery } from "../gallery/GalleryActions";
import { GalleryFooter } from "../gallery/GalleryFooter";
import { fitsWide, Frame, ownRatio, ownWidth } from "../gallery/GalleryGrid";
import { albumMeta, DownloadAllButton } from "../gallery/GalleryHeader";
import { CoverImage } from "../gallery/GalleryHero";
import { pad, type GalleryModel } from "../gallery/model";
import { StudioLockup } from "../ui/Logo";
import type { TemplateProps } from "./types";

const BG = "bg-[#F4F1EC]";
const ACCENT = "text-[#A18B76]";
const IMG = "transition duration-700 group-hover:scale-[1.02]";
const TILE = "bg-[#E6E0D7]";

const textButton =
  "inline-flex h-9 items-center gap-2 border-b border-[#222] text-[12px] font-medium uppercase tracking-[0.18em] text-[#222] transition hover:border-[#A18B76] hover:text-[#A18B76]";

function Caption({ model, index, extra = "" }: { model: GalleryModel; index: number; extra?: string }) {
  return (
    <figcaption className="mt-3 flex items-baseline gap-3 text-[11px] uppercase tracking-[0.2em] text-[#222]/60">
      <span className="font-cormorant text-lg normal-case italic tracking-normal text-[#222]">N°{pad(index + 1)}</span>
      <span>{extra || `Khung ${pad(index + 1)} / ${pad(model.photos.length)}`}</span>
    </figcaption>
  );
}

function TitleMarkup({ title }: { title: string }) {
  const words = String(title).trim().split(/\s+/);
  if (words.length < 2) return <>{title}</>;
  const cut = Math.ceil(words.length / 2);
  return (
    <>
      {words.slice(0, cut).join(" ")} <em className={`font-normal ${ACCENT}`}>{words.slice(cut).join(" ")}</em>
    </>
  );
}

// Each spread consumes a fixed number of frames and lays them out asymmetrically.
const SPREADS: Array<{ size: number; render: (model: GalleryModel, i: number) => ReactNode }> = [
  {
    size: 2,
    render: (model, i) => (
      <div className="grid gap-8 md:grid-cols-12 md:items-end md:gap-6">
        <figure className="md:col-span-7">
          <Frame index={i} ratio={4 / 5} width={1400} className={TILE} imgClass={IMG} />
          <Caption model={model} index={i} />
        </figure>
        {model.photos[i + 1] && (
          <figure className="w-2/3 justify-self-end md:col-span-4 md:col-start-9 md:mb-28 md:w-full">
            <Frame index={i + 1} ratio={3 / 4} width={900} className={TILE} imgClass={IMG} />
            <Caption model={model} index={i + 1} />
          </figure>
        )}
      </div>
    ),
  },
  {
    size: 1,
    render: (model, i) =>
      fitsWide(model.photos[i]) ? (
        <figure className="-mx-5 md:-mx-10">
          <Frame index={i} ratio={21 / 9} aspect="aspect-[4/3] md:aspect-[21/9]" width={2400} className={TILE} imgClass={IMG} />
          <div className="px-5 md:px-10">
            <Caption model={model} index={i} extra="Trang đôi" />
          </div>
        </figure>
      ) : (
        <figure className="mx-auto w-full" style={{ maxWidth: ownWidth(model.photos[i], 560) }}>
          <Frame index={i} ratio={ownRatio(model.photos[i])} width={1200} sizes="(min-width: 640px) 560px, 100vw" className={TILE} imgClass={IMG} />
          <Caption model={model} index={i} />
        </figure>
      ),
  },
  {
    size: 3,
    render: (model, i) => (
      <div className="grid grid-cols-3 gap-2 md:gap-6">
        {[0, 1, 2]
          .filter((offset) => model.photos[i + offset])
          .map((offset) => (
            <figure key={offset} className={offset === 1 ? "mt-8 md:mt-20" : ""}>
              <Frame index={i + offset} ratio={2 / 3} width={800} className={TILE} imgClass={IMG} />
              <p className="mt-2 font-cormorant text-base italic md:text-lg">N°{pad(i + offset + 1)}</p>
            </figure>
          ))}
      </div>
    ),
  },
  {
    size: 1,
    render: (model, i) => (
      <div className="grid gap-6 md:grid-cols-12 md:items-center md:gap-10">
        <div className="md:col-span-4">
          <p className={`font-cormorant text-[88px] font-light leading-none ${ACCENT} md:text-[140px]`}>{pad(i + 1)}</p>
          <p className="mt-4 max-w-xs font-cormorant text-2xl italic leading-snug md:text-[28px]">{model.title}</p>
          <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-[#222]/55">
            {model.customerName} · {formatDate(model.shootingDate)}
          </p>
        </div>
        {fitsWide(model.photos[i]) ? (
          <figure className="md:col-span-8">
            <Frame index={i} ratio={3 / 2} width={1800} className={TILE} imgClass={IMG} />
          </figure>
        ) : (
          <figure className="md:col-span-5 md:col-start-7">
            <Frame index={i} ratio={ownRatio(model.photos[i])} width={1200} sizes="(min-width: 768px) 40vw, 100vw" className={TILE} imgClass={IMG} />
          </figure>
        )}
      </div>
    ),
  },
];

function Spreads({ model, start }: { model: GalleryModel; start: number }) {
  const blocks: ReactNode[] = [];
  let index = start;
  let step = 0;
  while (index < model.photos.length) {
    const spread = SPREADS[step % SPREADS.length];
    blocks.push(<Fragment key={index}>{spread.render(model, index)}</Fragment>);
    index += spread.size;
    step += 1;
  }
  return <>{blocks}</>;
}

function ContactSheet({ model }: { model: GalleryModel }) {
  const { open } = useGallery();
  return (
    <>
      {model.photos.map((photo, index) => (
        <button key={photo.id} type="button" onClick={() => open(index)} className="group text-left" aria-label={`Mở ảnh ${index + 1}`}>
          <span className={`block aspect-square overflow-hidden ${TILE}`}>
            <img src={photoSrc(photo, 240, 1)} alt="" loading="lazy" className="h-full w-full object-cover grayscale transition duration-500 group-hover:grayscale-0" />
          </span>
          <span className="mt-1.5 block font-cormorant text-sm italic">{pad(index + 1)}</span>
        </button>
      ))}
    </>
  );
}

export function EditorialMagazine({ model, banner }: TemplateProps) {
  const meta = albumMeta(model);
  // With enough frames the first one becomes the hero inset, so the spreads skip it.
  const inset = model.photos.length > 3 ? 0 : -1;
  const start = inset + 1;
  return (
    <GalleryRoot model={model} lightbox="paper" pageBg="#F4F1EC" className={`font-inter min-h-screen ${BG} text-[#222]`}>
      {banner}
      <header className="sticky top-0 z-30 bg-[#F4F1EC]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-5 md:px-10">
          <ScrollLink to="top" label="Lên đầu trang">
            <StudioLockup studio={model.studio} size={20} compact mono />
          </ScrollLink>
          <nav className="hidden items-center gap-8 text-[12px] uppercase tracking-[0.18em] md:flex">
            <ScrollLink to="story" className="transition hover:text-[#A18B76]">
              Câu chuyện
            </ScrollLink>
            <ScrollLink to="gallery" className="transition hover:text-[#A18B76]">
              Bộ ảnh
            </ScrollLink>
            <ScrollLink to="index" className="transition hover:text-[#A18B76]">
              Mục lục
            </ScrollLink>
          </nav>
          <DownloadAllButton className={textButton} label="Tải cả album" short="Tải về" iconClass="h-3.5 w-3.5" />
        </div>
        <div className="mx-auto max-w-[1440px] px-5 md:px-10">
          <div className="flex items-center justify-between gap-4 border-y border-[#222] py-2 text-[10px] uppercase tracking-[0.24em] md:text-[11px]">
            <span>Số N°{meta.year.slice(2) || "01"}</span>
            <span className="hidden truncate font-cormorant text-sm normal-case italic tracking-normal sm:block">{model.title}</span>
            <span>
              {model.occasionLabel || "Ấn bản"} · {model.photoCount} khung hình
            </span>
          </div>
        </div>
      </header>

      <section id="story" className="mx-auto grid max-w-[1440px] scroll-mt-28 gap-10 px-5 pb-20 pt-10 md:grid-cols-12 md:gap-8 md:px-10 md:pb-32 md:pt-16">
        <div className="flex flex-col md:col-span-5 md:pr-4">
          <p className={`text-[11px] uppercase tracking-[0.3em] ${ACCENT}`}>
            {model.customerName} — {meta.year}
          </p>
          <h1 className="mt-6 font-cormorant text-[60px] font-light leading-[0.88] tracking-[-0.02em] sm:text-[84px] lg:text-[118px]">
            <TitleMarkup title={model.title} />
          </h1>
          {model.description && (
            <p className="mt-10 max-w-sm text-[15px] leading-7 text-[#222]/75 first-letter:float-left first-letter:mr-2 first-letter:font-cormorant first-letter:text-[64px] first-letter:leading-[0.8] first-letter:text-[#222]">
              {model.description}
            </p>
          )}
          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-[#222]/20 pt-6 text-sm md:mt-auto">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.24em] text-[#222]/55">Nhân vật</dt>
              <dd className="mt-1 font-cormorant text-xl">{model.customerName}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.24em] text-[#222]/55">Ngày chụp</dt>
              <dd className="mt-1 font-cormorant text-xl">{meta.date}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.24em] text-[#222]/55">Số khung hình</dt>
              <dd className="mt-1 font-cormorant text-xl">{model.photoCount}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.24em] text-[#222]/55">Chủ đề</dt>
              <dd className="mt-1 font-cormorant text-xl">{model.occasionLabel || "Portfolio"}</dd>
            </div>
          </dl>
        </div>
        <div className="relative md:col-span-7">
          <div className={`relative ml-auto aspect-[4/5] w-[88%] overflow-hidden ${TILE}`}>
            <CoverImage model={model} width={1600} ratio={4 / 5} className="absolute inset-0 h-full w-full" />
          </div>
          {inset >= 0 && (
            <div className="absolute -bottom-10 left-0 w-[40%] border-[6px] border-[#F4F1EC] md:-bottom-14 md:border-[10px]">
              <Frame index={inset} ratio={3 / 4} width={700} className={TILE} imgClass={IMG} />
            </div>
          )}
          <p className="mt-3 pl-[44%] text-right text-[10px] uppercase tracking-[0.24em] text-[#222]/55">Trang bìa — {model.customerName}</p>
        </div>
      </section>

      <section id="gallery" className="mx-auto max-w-[1440px] scroll-mt-28 px-5 md:px-10">
        <div className="flex items-end justify-between border-b border-[#222] pb-3">
          <h2 className="font-cormorant text-4xl font-light italic md:text-5xl">Tuyển tập</h2>
          <p className="text-[11px] uppercase tracking-[0.24em]">{model.photoCount} khung hình</p>
        </div>
        <div className="space-y-20 py-14 md:space-y-32 md:py-24">
          {model.photos.length ? <Spreads model={model} start={start} /> : <p className="font-cormorant text-2xl italic text-[#222]/60">Ảnh sẽ sớm xuất hiện tại đây.</p>}
        </div>
      </section>

      {model.photos.length > 0 && (
        <section id="index" className="mx-auto max-w-[1440px] scroll-mt-28 px-5 pb-20 md:px-10 md:pb-28">
          <div className="flex items-end justify-between border-b border-[#222] pb-3">
            <h2 className="font-cormorant text-4xl font-light italic md:text-5xl">Mục lục</h2>
            <DownloadAllButton className={textButton} label="Tải tất cả ảnh" short="Tải về" />
          </div>
          <div className="mt-8 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-9">
            <ContactSheet model={model} />
          </div>
        </section>
      )}
      <GalleryFooter tone="paper" studio={model.studio} />
    </GalleryRoot>
  );
}

export function EditorialMagazineThumbnail({ model }: { model: GalleryModel }) {
  const src = (index: number, width: number, ratio: number) => photoSrc(model.photos[index], width, ratio);
  return (
    <div className="flex h-full flex-col bg-[#F4F1EC] px-3 py-2 text-[#222]">
      <div className="flex items-center justify-between border-b border-[#222] pb-1 text-[5px] uppercase tracking-[0.25em]">
        <span className="font-semibold">Picora</span>
        <span>Câu chuyện · Bộ ảnh · Mục lục</span>
      </div>
      <div className="mt-2 grid flex-1 grid-cols-12 gap-2">
        <div className="col-span-5 flex flex-col">
          <p className="text-[4.5px] uppercase tracking-[0.3em] text-[#A18B76]">{model.customerName}</p>
          <p className="mt-1 font-cormorant text-[22px] font-light leading-[0.85]">
            <TitleMarkup title={model.title} />
          </p>
          <div className="mt-auto grid grid-cols-2 gap-1 border-t border-[#222]/20 pt-1 font-cormorant text-[6px]">
            <span>{albumMeta(model).date}</span>
            <span>{model.photoCount} khung hình</span>
          </div>
        </div>
        <div className="relative col-span-7">
          <img src={photoSrc(model.coverPhoto, 360, 0.8)} alt="" className="ml-auto aspect-[4/5] w-[86%] object-cover" />
          <img src={src(0, 160, 0.75)} alt="" className="absolute -bottom-1 left-0 aspect-[3/4] w-[38%] border-2 border-[#F4F1EC] object-cover" />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1">
        <img src={src(2, 140, 1.4)} alt="" className="aspect-[7/5] w-full object-cover" />
        <img src={src(3, 140, 1.4)} alt="" className="mt-1 aspect-[7/5] w-full object-cover" />
        <img src={src(4, 140, 1.4)} alt="" className="aspect-[7/5] w-full object-cover" />
      </div>
    </div>
  );
}
