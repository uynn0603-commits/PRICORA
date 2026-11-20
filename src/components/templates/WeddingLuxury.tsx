"use client";

/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import { photoSrc } from "@/lib/media";
import { GalleryRoot, ScrollLink } from "../gallery/GalleryActions";
import { GalleryFooter } from "../gallery/GalleryFooter";
import { fitsWide, Frame, ownRatio, ownWidth } from "../gallery/GalleryGrid";
import { albumMeta, DownloadAllButton } from "../gallery/GalleryHeader";
import { CoverImage } from "../gallery/GalleryHero";
import { splitCouple, type GalleryModel } from "../gallery/model";
import { StudioLockup } from "../ui/Logo";
import type { TemplateProps } from "./types";

const INK = "text-[#29251F]";
const ACCENT = "text-[#B99A72]";
const IMG_HOVER = "transition duration-[1200ms] ease-out group-hover:scale-[1.015]";

const outlineButton =
  "inline-flex h-10 items-center justify-center gap-2 border border-[#29251F]/25 px-4 text-[12px] font-medium uppercase tracking-[0.16em] text-[#29251F] transition hover:border-[#B99A72] hover:text-[#B99A72]";

function Names({ model }: { model: GalleryModel }) {
  const couple = splitCouple(model.customerName);
  if (!couple) return <span className="block">{model.customerName || model.title}</span>;
  return (
    <>
      <span className="block">{couple[0]}</span>
      <span className={`my-1 block font-playfair text-[0.55em] italic ${ACCENT}`}>&amp;</span>
      <span className="block">{couple[1]}</span>
    </>
  );
}

function Divider() {
  return (
    <div className={`mx-auto flex items-center justify-center gap-4 ${ACCENT}`} aria-hidden="true">
      <span className="h-px w-14 bg-[#B99A72]/60" />
      <span className="h-1.5 w-1.5 rotate-45 border border-[#B99A72]" />
      <span className="h-px w-14 bg-[#B99A72]/60" />
    </div>
  );
}

// Balanced rhythm: a wide frame, a pair, a centred portrait, then a pair again.
function Gallery({ model }: { model: GalleryModel }) {
  const pattern = ["full", "pair", "single", "pair"];
  const blocks: ReactNode[] = [];
  let index = 0;
  let step = 0;
  while (index < model.photos.length) {
    const kind = pattern[step % pattern.length];
    if (kind === "full" && fitsWide(model.photos[index])) {
      blocks.push(<Frame key={index} index={index} ratio={3 / 2} width={2200} className="bg-[#EAE5DC]" imgClass={IMG_HOVER} />);
      index += 1;
    } else if (kind === "full" || kind === "single") {
      blocks.push(
        <div key={index} className="mx-auto" style={{ maxWidth: ownWidth(model.photos[index], 720) }}>
          <Frame index={index} ratio={ownRatio(model.photos[index])} width={1400} sizes="(min-width: 768px) 720px, 100vw" className="bg-[#EAE5DC]" imgClass={IMG_HOVER} />
        </div>,
      );
      index += 1;
    } else {
      blocks.push(
        <div key={index} className="grid grid-cols-2 gap-3 md:gap-8">
          <Frame index={index} ratio={4 / 5} width={1200} sizes="50vw" className="bg-[#EAE5DC]" imgClass={IMG_HOVER} />
          {model.photos[index + 1] && <Frame index={index + 1} ratio={4 / 5} width={1200} sizes="50vw" className="bg-[#EAE5DC]" imgClass={IMG_HOVER} />}
        </div>,
      );
      index += 2;
    }
    step += 1;
  }
  return <>{blocks}</>;
}

export function WeddingLuxury({ model, banner }: TemplateProps) {
  const meta = albumMeta(model);
  const eyebrow = model.occasion === "Wedding" ? "Lễ cưới của" : model.occasionLabel || "Kỷ niệm";
  return (
    <GalleryRoot model={model} lightbox="ivory" pageBg="#FAF9F6" className={`font-inter min-h-screen bg-[#FAF9F6] ${INK}`}>
      {banner}
      <header className="sticky top-0 z-30 border-b border-[#EAE5DC] bg-[#FAF9F6]/95 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-[1500px] grid-cols-[auto_1fr] items-center gap-4 px-4 md:grid-cols-[1fr_auto_1fr] md:px-10">
          <ScrollLink to="top" className="opacity-80 transition hover:opacity-100" label="Lên đầu trang">
            <StudioLockup studio={model.studio} size={20} compact mono />
          </ScrollLink>
          <p className="hidden truncate text-center font-playfair text-base italic md:block">{model.title}</p>
          <nav className="flex items-center justify-end gap-6">
            <ScrollLink to="gallery" className="hidden text-[12px] uppercase tracking-[0.16em] text-[#29251F]/70 transition hover:text-[#B99A72] sm:inline">
              Bộ ảnh
            </ScrollLink>
            <DownloadAllButton className={outlineButton} label="Tải cả album" short="Tải về" iconClass="h-3.5 w-3.5" />
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-[1500px] px-3 pt-3 md:px-10 md:pt-10">
        <div className="relative h-[68svh] min-h-[420px] max-h-[940px] overflow-hidden bg-[#EAE5DC] md:h-[82vh]">
          <CoverImage model={model} width={2400} ratio={16 / 10} className="absolute inset-0 h-full w-full" />
        </div>
      </section>

      <section className="px-6 py-16 text-center md:py-28">
        <p className={`text-[11px] font-medium uppercase tracking-[0.38em] ${ACCENT}`}>{eyebrow}</p>
        <h1 className="mt-7 font-playfair text-[44px] font-normal leading-[1.04] tracking-[-0.01em] sm:text-6xl md:text-7xl lg:text-[88px]">
          <Names model={model} />
        </h1>
        <div className="mt-10">
          <Divider />
        </div>
        <p className="mt-8 font-playfair text-lg italic md:text-xl">{meta.date}</p>
        <p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-[#29251F]/55">{meta.count}</p>
        {model.description && <p className="mx-auto mt-10 max-w-xl text-[15px] leading-8 text-[#29251F]/70">{model.description}</p>}
      </section>

      <section id="gallery" className="mx-auto max-w-[1500px] scroll-mt-20 space-y-3 px-3 pb-20 md:space-y-8 md:px-10 md:pb-32">
        {model.photos.length ? <Gallery model={model} /> : <p className="py-20 text-center font-playfair italic text-[#29251F]/60">Ảnh sẽ sớm xuất hiện tại đây.</p>}
      </section>

      {model.settings.allowDownload && model.photoCount > 0 && (
        <section className="border-t border-[#EAE5DC] px-6 py-20 text-center md:py-28">
          <Divider />
          <h2 className="mt-8 font-playfair text-3xl md:text-4xl">Lưu giữ mọi khoảnh khắc</h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#29251F]/65">Tải trọn bộ {meta.count} theo đúng thứ tự gốc.</p>
          <div className="mt-8">
            <DownloadAllButton className={`${outlineButton} h-12 px-7`} label="Tải cả album" short="Tải cả album" />
          </div>
        </section>
      )}
      <GalleryFooter tone="ivory" studio={model.studio} />
    </GalleryRoot>
  );
}

export function WeddingLuxuryThumbnail({ model }: { model: GalleryModel }) {
  const src = (index: number, width = 360, ratio?: number) => photoSrc(model.photos[index], width, ratio);
  const couple = splitCouple(model.customerName) || [model.customerName, ""];
  const meta = albumMeta(model);
  return (
    <div className="flex h-full flex-col bg-[#FAF9F6] text-[#29251F]">
      <div className="flex items-center justify-between border-b border-[#EAE5DC] px-3 py-1.5 text-[6px] uppercase tracking-[0.2em]">
        <span className="font-semibold">Picora</span>
        <span className="font-playfair normal-case italic tracking-normal">{model.customerName}</span>
        <span>Bộ ảnh</span>
      </div>
      <div className="px-2 pt-2">
        <img src={photoSrc(model.coverPhoto, 600, 2.6)} alt="" className="aspect-[2.6/1] w-full object-cover" />
      </div>
      <div className="py-2.5 text-center">
        <p className="text-[5px] uppercase tracking-[0.3em] text-[#B99A72]">Lễ cưới của</p>
        <p className="mt-0.5 font-playfair text-[15px] leading-none">
          {couple[0]}{" "}
          {couple[1] && (
            <>
              <span className="italic text-[#B99A72]">&amp;</span> {couple[1]}
            </>
          )}
        </p>
        <p className="mt-1 font-playfair text-[6px] italic">{meta.date}</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5 px-2 pb-2">
        <img src={src(0, 300, 1.25)} alt="" className="aspect-[5/4] w-full object-cover" />
        <img src={src(1, 300, 1.25)} alt="" className="aspect-[5/4] w-full object-cover" />
      </div>
    </div>
  );
}
