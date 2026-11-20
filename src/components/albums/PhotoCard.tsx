"use client";

import type { DragEvent } from "react";
import { cn, formatBytes, formatDate } from "@/lib/format";
import { photoSrc } from "@/lib/media";
import type { Album, Photo, PhotoEdit } from "@/lib/types";
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
  request,
  edit,
  onEdit,
  onUndoEdit,
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
  // The client's retouch request for this photo, independent of `picked` (a favourite).
  request?: string;
  // The studio's answer, only while it still matches `request`.
  edit?: PhotoEdit | null;
  onEdit?: (id: string) => void;
  onUndoEdit?: (id: string) => void;
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
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-rose-500" title="Khách yêu thích ảnh này">
              <Icon name="heart" className="h-3 w-3 fill-current" /> Yêu thích
            </span>
          ) : null}
          {isCover ? <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink">Ảnh bìa</span> : null}
          {album.mobileCoverId === photo.id ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink" title="Ảnh bìa trên điện thoại">
              <Icon name="smartphone" className="h-3 w-3" /> Bìa ĐT
            </span>
          ) : null}
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
      {request && edit ? (
        <div className="mt-1.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-[12px] leading-snug text-ink">
          <p className="flex items-center gap-1.5 font-semibold text-emerald-700">
            <Icon name="circle-check" className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              Đã sửa · {formatDate(edit.doneAt)}
              {edit.replaced ? " · đã thay ảnh" : ""}
            </span>
            {onUndoEdit ? (
              <button type="button" onClick={() => onUndoEdit(photo.id)} className="shrink-0 font-medium text-mist hover:text-ink">
                Hoàn tác
              </button>
            ) : null}
          </p>
          <p className="mt-1 line-clamp-2 whitespace-pre-line text-mist [overflow-wrap:anywhere]" title={request}>
            {request}
          </p>
          {edit.reply ? <p className="mt-1 line-clamp-3 whitespace-pre-line [overflow-wrap:anywhere]">“{edit.reply}”</p> : null}
        </div>
      ) : request ? (
        <div className="mt-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[12px] leading-snug text-ink">
          <p className="flex gap-1.5" title={request}>
            <Icon name="notebook-pen" className="mt-px h-3.5 w-3.5 shrink-0 text-amber-700" />
            <span className="line-clamp-3 min-w-0 whitespace-pre-line [overflow-wrap:anywhere]">{request}</span>
          </p>
          {onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(photo.id)}
              className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-amber-200 bg-white font-semibold text-amber-800 hover:bg-amber-100"
            >
              <Icon name="check" className="h-3.5 w-3.5" /> Đánh dấu đã sửa
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
