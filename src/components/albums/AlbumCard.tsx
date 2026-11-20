"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { getTemplateMeta, type TemplateMeta } from "@/lib/catalog";
import { cn, formatDate, occasionLabel, plural } from "@/lib/format";
import { coverSrc } from "@/lib/media";
import { effectiveStatus } from "@/lib/store";
import type { Album } from "@/lib/types";
import { ui } from "@/lib/ui";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";

export type AlbumMoreHandler = (album: Album, anchor: HTMLElement) => void;

function Cover({ album, className }: { album: Album; className: string }) {
  const src = coverSrc(album, 900);
  if (!src) {
    return (
      <span className={cn(className, "grid place-items-center bg-canvas text-mist")}>
        <Icon name="image" className="h-5 w-5" />
      </span>
    );
  }
  return <img src={src} alt="" className={cn(className, "object-cover")} loading="lazy" decoding="async" />;
}

function TemplateSwatch({ meta, size = "h-6 w-8" }: { meta: TemplateMeta; size?: string }) {
  const { bg, ink, accent } = meta.swatch;
  return (
    <span className={cn("relative shrink-0 overflow-hidden rounded-[5px] ring-1 ring-black/10", size)} style={{ background: bg }} aria-hidden="true">
      <span className="absolute inset-x-[18%] top-[22%] h-[30%] rounded-[2px]" style={{ background: ink, opacity: 0.82 }} />
      <span className="absolute bottom-[18%] left-[18%] h-[12%] w-[40%] rounded-full" style={{ background: accent }} />
    </span>
  );
}

export function TemplateChip({ album }: { album: Album }) {
  const meta = getTemplateMeta(album.templateId);
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <TemplateSwatch meta={meta} />
      <span className="truncate text-xs font-medium text-ink">{meta.name}</span>
    </span>
  );
}

function subtitle(album: Album) {
  const occasion = occasionLabel(album.occasion) || "Album";
  if (!album.customerName || album.customerName === album.name) return occasion;
  return `${album.customerName} · ${occasion}`;
}

function moreClick(album: Album, onMore: AlbumMoreHandler) {
  return (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onMore(album, event.currentTarget);
  };
}

function GridCard({ album, onMore }: { album: Album; onMore: AlbumMoreHandler }) {
  const status = effectiveStatus(album);
  return (
    <article className={cn("group relative", ui.card, "overflow-hidden")}>
      <Link href={`/admin/albums/${album.id}/photos`} className="block">
        <span className="relative block aspect-[4/3] overflow-hidden bg-canvas">
          <Cover album={album} className="h-full w-full transition duration-500 group-hover:scale-[1.03]" />
        </span>
        <span className="block p-4">
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold">{album.name}</span>
              <span className="mt-1 block truncate text-sm text-mist">{subtitle(album)}</span>
            </span>
          </span>
          <span className="mt-4 flex items-center justify-between gap-3 text-xs text-mist">
            <span>{formatDate(album.shootingDate)}</span>
            <span>{plural(album.photos.length, "photo")}</span>
          </span>
        </span>
      </Link>
      <div className="mx-4 flex items-center justify-between gap-3 border-t border-line py-3">
        <TemplateChip album={album} />
        <Link href={`/admin/albums/${album.id}/template`} className="shrink-0 text-xs font-semibold text-primary hover:underline">
          Đổi giao diện
        </Link>
      </div>
      <span className="absolute left-3 top-3">
        <StatusBadge status={status} />
      </span>
      <button
        type="button"
        onClick={moreClick(album, onMore)}
        className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-ink shadow-sm"
        aria-label="Thao tác album"
      >
        <Icon name="more-horizontal" className="h-4 w-4" />
      </button>
    </article>
  );
}

function ListRow({ album, onMore }: { album: Album; onMore: AlbumMoreHandler }) {
  const status = effectiveStatus(album);
  return (
    <article className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4">
      <Link href={`/admin/albums/${album.id}/photos`} className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <Cover album={album} className="h-16 w-16 shrink-0 rounded-xl" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{album.name}</span>
          <span className="mt-0.5 block truncate text-sm text-mist">{subtitle(album)}</span>
        </span>
        <span className="hidden w-28 shrink-0 text-sm text-mist md:block">{formatDate(album.shootingDate)}</span>
        <span className="hidden w-24 shrink-0 text-sm text-mist lg:block">{plural(album.photos.length, "photo")}</span>
        <span className="hidden w-44 shrink-0 xl:block">
          <TemplateChip album={album} />
        </span>
        <span className="hidden sm:block">
          <StatusBadge status={status} />
        </span>
      </Link>
      <button
        type="button"
        onClick={moreClick(album, onMore)}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-mist hover:bg-canvas hover:text-ink"
        aria-label="Thao tác album"
      >
        <Icon name="more-horizontal" className="h-4 w-4" />
      </button>
    </article>
  );
}

export function AlbumGrid({ albums, onMore }: { albums: Album[]; onMore: AlbumMoreHandler }) {
  if (!albums.length) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {albums.map((album) => (
        <GridCard key={album.id} album={album} onMore={onMore} />
      ))}
    </div>
  );
}

export function AlbumList({ albums, onMore }: { albums: Album[]; onMore: AlbumMoreHandler }) {
  if (!albums.length) return null;
  return (
    <div className={cn(ui.card, "divide-y divide-line")}>
      {albums.map((album) => (
        <ListRow key={album.id} album={album} onMore={onMore} />
      ))}
    </div>
  );
}
