"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { photoSrc } from "@/lib/media";
import { GalleryRoot, ScrollLink } from "../gallery/GalleryActions";
import { GalleryFooter } from "../gallery/GalleryFooter";
import { Frame } from "../gallery/GalleryGrid";
import { albumMeta, DownloadAllButton } from "../gallery/GalleryHeader";
import { CoverImage } from "../gallery/GalleryHero";
import type { GalleryModel } from "../gallery/model";
import { Icon } from "../ui/Icon";
import { StudioLockup } from "../ui/Logo";
import type { TemplateProps } from "./types";

const BATCH = 24;

const primaryButton =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[#7552F6] px-4 text-sm font-semibold text-white transition hover:bg-[#6340E8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7552F6] md:px-5";

const HOVER_OVERLAY = (
  <span className="pointer-events-none absolute inset-0 flex items-end justify-end bg-black/0 p-2.5 opacity-0 transition duration-300 group-hover:bg-black/10 group-hover:opacity-100">
    <span className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-[#202124]">
      <Icon name="expand" className="h-4 w-4" />
    </span>
  </span>
);

function Chip({ children }: { children: ReactNode }) {
  return <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#E8EAED] px-3 text-[13px] font-medium text-[#3C4043]">{children}</span>;
}

// Renders the first batch, then appends another batch whenever the sentinel nears the viewport.
function MasonryTiles({ model }: { model: GalleryModel }) {
  const [rendered, setRendered] = useState(BATCH);
  const sentinel = useRef<HTMLDivElement>(null);
  const total = model.photos.length;

  useEffect(() => {
    const node = sentinel.current;
    if (!node || total <= BATCH) return;
    let count = BATCH;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        count += BATCH;
        setRendered(count);
        if (count >= total) observer.disconnect();
      },
      { rootMargin: "1200px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [total]);

  return (
    <>
      <div id="masonry" className="masonry-grid">
        {model.photos.slice(0, Math.min(rendered, total)).map((photo, index) => (
          <figure key={photo.id}>
            <Frame
              index={index}
              width={720}
              sizes="(min-width: 1200px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="rounded-lg bg-[#F1F3F4]"
              imgClass="transition duration-500 group-hover:scale-[1.02]"
              overlay={HOVER_OVERLAY}
            />
          </figure>
        ))}
      </div>
      <div ref={sentinel} id="masonry-more" className="h-px" />
    </>
  );
}

export function MasonryGallery({ model, banner }: TemplateProps) {
  const meta = albumMeta(model);
  return (
    <GalleryRoot model={model} lightbox="dark" pageBg="#FFFFFF" className="font-jakarta min-h-screen bg-white text-[#202124]">
      {banner}
      <header className="sticky top-0 z-30 border-b border-[#E8EAED] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 md:px-8">
          <ScrollLink to="top" className="shrink-0" label="Lên đầu trang">
            <StudioLockup studio={model.studio} size={28} compact />
          </ScrollLink>
          <span className="hidden h-6 w-px bg-[#E8EAED] sm:block" />
          <div className="hidden min-w-0 flex-1 sm:block">
            <p className="truncate text-sm font-semibold">{model.title}</p>
            <p className="truncate text-xs text-[#5F6368]">{[meta.showCustomer ? model.customerName : "", meta.date].filter(Boolean).join(" · ")}</p>
          </div>
          <span className="flex-1 sm:hidden" />
          <DownloadAllButton className={primaryButton} label="Tải tất cả" short="Tải về" />
        </div>
      </header>

      <section className="mx-auto max-w-[1600px] px-3 pt-3 md:px-8 md:pt-6">
        <div className="relative h-[38vh] min-h-[240px] max-h-[520px] overflow-hidden rounded-2xl bg-[#F1F3F4] md:h-[46vh]">
          <CoverImage model={model} width={2200} ratio={2.6} className="absolute inset-0 h-full w-full" />
        </div>
        <div className="flex flex-col gap-5 py-6 md:flex-row md:items-end md:justify-between md:py-9">
          <div className="min-w-0 max-w-3xl">
            {model.occasionLabel && <p className="text-sm font-semibold text-[#7552F6]">{model.occasionLabel}</p>}
            <h1 className="mt-1.5 text-[28px] font-bold leading-tight tracking-[-0.02em] md:text-[40px]">{model.title}</h1>
            {model.description && <p className="mt-3 text-[15px] leading-relaxed text-[#5F6368]">{model.description}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Chip>
              <Icon name="images" className="h-3.5 w-3.5 text-[#7552F6]" /> {meta.count}
            </Chip>
            <Chip>
              <Icon name="calendar" className="h-3.5 w-3.5 text-[#7552F6]" /> {meta.date}
            </Chip>
            {meta.showCustomer && (
              <Chip>
                <Icon name="user-round" className="h-3.5 w-3.5 text-[#7552F6]" /> {model.customerName}
              </Chip>
            )}
          </div>
        </div>
      </section>

      <section id="gallery" className="mx-auto max-w-[1600px] scroll-mt-20 px-3 pb-16 md:px-8">
        {model.photos.length ? (
          <MasonryTiles model={model} />
        ) : (
          <div className="rounded-2xl border border-dashed border-[#E8EAED] py-20 text-center text-sm text-[#5F6368]">Ảnh sẽ sớm xuất hiện tại đây.</div>
        )}
      </section>
      <GalleryFooter tone="light" studio={model.studio} />
    </GalleryRoot>
  );
}

export function MasonryGalleryThumbnail({ model }: { model: GalleryModel }) {
  const columns = [
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
  ];
  return (
    <div className="flex h-full flex-col bg-white text-[#202124]">
      <div className="flex items-center justify-between border-b border-[#E8EAED] px-2.5 py-1.5">
        <span className="text-[6px] font-bold uppercase tracking-[0.18em]">Picora</span>
        <span className="rounded-full bg-[#7552F6] px-1.5 py-0.5 text-[5px] font-semibold text-white">Tải tất cả</span>
      </div>
      <div className="px-2 pt-1.5">
        <img src={photoSrc(model.coverPhoto, 500, 3.2)} alt="" className="aspect-[3.2/1] w-full rounded object-cover" />
      </div>
      <div className="flex items-end justify-between px-2 py-1.5">
        <p className="text-[9px] font-bold leading-none">{model.title}</p>
        <span className="rounded-full border border-[#E8EAED] px-1 text-[5px]">{model.photoCount} ảnh</span>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-1 overflow-hidden px-2">
        {columns.map((column, key) => (
          <div key={key} className="space-y-1">
            {column.map((index) => {
              const photo = model.photos[index];
              return photo ? (
                <img key={index} src={photoSrc(photo, 140)} alt="" className="w-full rounded-[2px] object-cover" style={{ aspectRatio: `${photo.w}/${photo.h}` }} />
              ) : null;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
