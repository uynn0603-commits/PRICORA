"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { downloadPhoto } from "@/lib/download";
import { cn, frameLabel } from "@/lib/format";
import { toast } from "@/lib/overlay";
import type { Photo } from "@/lib/types";
import { Icon } from "../ui/Icon";
import { openNote, studioEdit, toggleFavorite, useSelection } from "./selection";

const THEMES = {
  dark: {
    root: "bg-black text-white",
    control: "text-white/90 hover:bg-white/10",
    nav: "bg-white/10 text-white hover:bg-white/20",
    count: "",
  },
  noir: {
    root: "bg-[#0B0B0B] text-white",
    control: "text-white/85 hover:bg-white/10",
    nav: "border border-white/15 text-white hover:bg-white/10",
    count: "font-cormorant text-lg tracking-[0.2em] text-[#C8A96A]",
  },
  ivory: {
    root: "bg-[#FAF9F6] text-[#29251F]",
    control: "text-[#29251F] hover:bg-[#29251F]/5",
    nav: "border border-[#EAE5DC] bg-[#FAF9F6] text-[#29251F] hover:border-[#B99A72]",
    count: "font-playfair italic text-base tracking-[0.12em] text-[#B99A72]",
  },
  paper: {
    root: "bg-[#F4F1EC] text-[#222]",
    control: "text-[#222] hover:bg-[#222]/5",
    nav: "border border-[#222]/15 text-[#222] hover:bg-[#222]/5",
    count: "font-cormorant text-xl italic",
  },
};

type LightboxImage = Photo & { src?: string };

interface LightboxState {
  photos: LightboxImage[];
  index: number;
  theme: string;
  allowDownload: boolean;
  selectable: boolean;
}

let state: LightboxState | null = null;
const listeners = new Set<() => void>();

function set(next: LightboxState | null) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getState() {
  return state;
}

export function closeLightbox() {
  if (state) set(null);
}

export function openLightbox(
  photos: Photo[],
  index = 0,
  { theme = "dark", allowDownload = true, selectable = false }: { theme?: string; allowDownload?: boolean; selectable?: boolean } = {},
) {
  if (!photos.length) {
    closeLightbox();
    return;
  }
  set({ photos, index: Math.max(0, Math.min(index, photos.length - 1)), theme, allowDownload, selectable });
}

function step(delta: number) {
  if (!state) return;
  const next = state.index + delta;
  if (next < 0 || next >= state.photos.length) return;
  set({ ...state, index: next });
}

export function LightboxHost() {
  const current = useSyncExternalStore(subscribe, getState, () => null);
  if (!current) return null;
  return createPortal(<Lightbox state={current} />, document.body);
}

function Lightbox({ state: current }: { state: LightboxState }) {
  const look = THEMES[current.theme as keyof typeof THEMES] || THEMES.dark;
  const closeRef = useRef<HTMLButtonElement>(null);
  const startX = useRef(0);
  const photo = current.photos[current.index];
  const selection = useSelection();
  const pickable = current.selectable && selection;
  const picked = Boolean(pickable && selection.picked.includes(photo.id));
  const request = pickable ? selection.notes[photo.id] : "";
  const done = pickable ? studioEdit(selection, photo.id) : null;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [role=dialog][aria-labelledby]")) return;
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      }
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const upcoming = current.photos[current.index + 1];
    if (upcoming?.src) {
      const preload = new Image();
      preload.src = upcoming.src;
    }
  }, [current]);

  const download = async () => {
    const saved = await downloadPhoto(photo);
    toast(saved ? "Đã tải ảnh" : "Đã mở ảnh để bạn lưu về máy.", saved ? "success" : "info");
  };

  return (
    <div className={cn("fixed inset-0 z-[70] flex flex-col", look.root)} role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-3 py-3 sm:px-5">
        <p className={cn("min-w-16 text-sm font-medium tabular-nums tracking-wide", look.count)}>{frameLabel(current.index, current.photos.length)}</p>
        <div className="flex items-center gap-1">
          {pickable && (
            <>
              <button
                type="button"
                onClick={() => toggleFavorite(photo.id)}
                aria-pressed={picked}
                aria-label={picked ? "Bỏ yêu thích" : "Yêu thích"}
                className={cn("inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold tabular-nums", look.control)}
              >
                <Icon name="heart" className={cn("h-5 w-5", picked && "fill-current text-rose-500")} />
                {selection.limit ? `${selection.picked.length}/${selection.limit}` : selection.picked.length}
              </button>
              <button
                type="button"
                onClick={() => openNote(photo.id)}
                aria-label={request ? "Xem yêu cầu sửa" : "Yêu cầu sửa ảnh này"}
                className={cn("relative grid h-11 w-11 place-items-center rounded-full", look.control)}
              >
                <Icon name="notebook-pen" className="h-5 w-5" />
                {request ? <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden /> : null}
              </button>
            </>
          )}
          {current.allowDownload && (
            <button type="button" onClick={download} className={cn("grid h-11 w-11 place-items-center rounded-full", look.control)} aria-label="Tải ảnh">
              <Icon name="download" className="h-5 w-5" />
            </button>
          )}
          <button ref={closeRef} type="button" onClick={closeLightbox} className={cn("grid h-11 w-11 place-items-center rounded-full", look.control)} aria-label="Đóng">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-6 sm:px-20"
        onTouchStart={(event) => {
          startX.current = event.changedTouches[0].clientX;
        }}
        onTouchEnd={(event) => {
          const delta = event.changedTouches[0].clientX - startX.current;
          if (delta > 48) step(-1);
          if (delta < -48) step(1);
        }}
      >
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={current.index === 0}
          className={cn("absolute left-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full disabled:opacity-25 sm:left-5", look.nav)}
          aria-label="Ảnh trước"
        >
          <Icon name="chevron-left" className="h-6 w-6" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.src || undefined} alt={photo.name || ""} className="max-h-full max-w-full object-contain" />
        <button
          type="button"
          onClick={() => step(1)}
          disabled={current.index === current.photos.length - 1}
          className={cn("absolute right-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full disabled:opacity-25 sm:right-5", look.nav)}
          aria-label="Ảnh tiếp theo"
        >
          <Icon name="chevron-right" className="h-6 w-6" />
        </button>
      </div>
      {request ? (
        <button
          type="button"
          onClick={() => openNote(photo.id)}
          className="mx-3 mb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-start gap-2 rounded-xl bg-white px-4 py-3 text-left text-sm text-[#191827] shadow-sm sm:mx-auto sm:w-full sm:max-w-xl"
        >
          <Icon name={done ? "circle-check" : "notebook-pen"} className={cn("mt-0.5 h-4 w-4 shrink-0", done ? "text-emerald-600" : "text-amber-600")} />
          <span className="min-w-0 flex-1">
            {done ? <span className="block text-xs font-semibold text-emerald-700">Studio đã sửa{done.reply ? `: “${done.reply}”` : ""}</span> : null}
            <span className={cn("line-clamp-2 [overflow-wrap:anywhere]", done && "text-[#77758A]")}>{request}</span>
          </span>
          <span className="shrink-0 text-xs font-semibold text-[#77758A]">{done ? "Xem" : "Sửa"}</span>
        </button>
      ) : null}
    </div>
  );
}
