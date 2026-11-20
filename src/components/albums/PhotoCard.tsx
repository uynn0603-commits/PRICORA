"use client";

import type { DragEvent } from "react";
import { cn, formatBytes, formatDate } from "@/lib/format";
import { photoSrc } from "@/lib/media";
import type { Album, Photo } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";

export function PhotoCard({
  photo,
  album,
  selected,
  onToggle,
  onPreview,
  onDragStart,
  onDrop,
  picked = false,
  sortable = true,
}: {
  photo: Photo;
  album: Album;
  selected: boolean;
  onToggle: (id: string, checked: boolean) => void;
  onPreview: (id: string) => void;
  onDragStart: (id: string, event: DragEvent<HTMLButtonElement>) => void;
  onDrop: (id: string, event: DragEvent<HTMLElement>) => void;
  picked?: boolean;
  sortable?: boolean;
}) {
  const src = photoSrc(photo, 700);
  const isCover = album.coverId === photo.id || (!album.coverId && !album.coverDataUrl && album.photos[0]?.id === photo.id);
  const frame = selected ? "border-primary ring-2 ring-primary/25" : "border-line";
  return (
    <article className="group" onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(photo.id, event)}>
      <div className={cn("relative aspect-square overflow-hidden rounded-xl border", frame, "bg-canvas")}>
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" draggable={false} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center text-mist">
            <Icon name="image" className="h-5 w-5" />
            <span className="text-[11px]">Không hiển thị được ảnh</span>
          </div>
        )}
        <label className="absolute left-2 top-2 z-10 cursor-pointer">
          <input
            type="checkbox"
            value={photo.id}
            checked={selected}
            onChange={(event) => onToggle(photo.id, event.target.checked)}
            className="peer sr-only"
          />
          <span className={cn("grid h-6 w-6 place-items-center rounded-md", selected ? "bg-primary text-white" : "border border-white bg-ink/30 text-transparent")}>
            <Icon name="check" className="h-3.5 w-3.5" />
          </span>
        </label>
        <span className="absolute right-2 top-2 z-10 flex gap-1">
          {picked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-rose-500" title="Khách đã chọn">
              <Icon name="heart" className="h-3 w-3 fill-current" /> Khách chọn
            </span>
          ) : null}
          {isCover ? <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink">Ảnh bìa</span> : null}
        </span>
        <button type="button" onClick={() => onPreview(photo.id)} className="absolute inset-0 z-[1]" aria-label={`Xem ${photo.name}`} />
      </div>
      <div className="mt-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">{photo.name}</p>
          <p className="text-[12px] text-mist">
            {formatBytes(photo.size)} · {formatDate(photo.uploadedAt)}
          </p>
        </div>
        {sortable ? (
          <button
            type="button"
            draggable
            onDragStart={(event) => onDragStart(photo.id, event)}
            className="mt-0.5 cursor-grab text-mist active:cursor-grabbing"
            aria-label="Kéo để sắp xếp"
          >
            <Icon name="grip-vertical" className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </article>
  );
}
