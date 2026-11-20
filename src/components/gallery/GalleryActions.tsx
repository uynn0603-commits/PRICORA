"use client";

import { createContext, useContext, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { downloadAlbumZip } from "@/lib/download";
import { toast } from "@/lib/overlay";
import { ui } from "@/lib/ui";
import { lightboxPhotos, type GalleryModel } from "./model";
import { openLightbox } from "./PhotoLightbox";
import { SelectionBar } from "./SelectionBar";
import { startSelection, stopSelection } from "./selection";

interface GalleryActions {
  model: GalleryModel;
  open: (index: number) => void;
  downloadAll: () => void;
}

const GalleryContext = createContext<GalleryActions | null>(null);

export function useGallery(): GalleryActions {
  const value = useContext(GalleryContext);
  if (!value) throw new Error("useGallery must be used inside <GalleryRoot>");
  return value;
}

let zipping = false;

// The behaviour every template shares: opening the lightbox, downloading the album and
// in-page anchors. Templates only provide markup and call these through the context.
export function GalleryRoot({
  model,
  lightbox = "dark",
  pageBg,
  className,
  children,
}: {
  model: GalleryModel;
  lightbox?: string;
  pageBg?: string;
  className: string;
  children: ReactNode;
}) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    if (!pageBg) return;
    const previous = document.body.style.backgroundColor;
    document.body.style.backgroundColor = pageBg;
    return () => {
      document.body.style.backgroundColor = previous;
    };
  }, [pageBg]);

  const selection = model.selection;
  const photoKey = model.allPhotos.map((photo) => photo.id).join(",");
  useEffect(() => {
    startSelection(
      selection
        ? {
            albumId: model.id,
            studioSlug: selection.studioSlug,
            albumSlug: model.slug,
            limit: selection.limit,
            locked: selection.locked,
            preview: selection.preview,
            submitted: selection.submitted,
            photoIds: model.allPhotos.map((photo) => photo.id),
          }
        : null,
    );
    return () => stopSelection(model.id);
    // The model is rebuilt on every store change; restart only when what the picker depends on changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.id, model.slug, photoKey, Boolean(selection), selection?.limit, selection?.locked, selection?.preview, selection?.submitted?.submittedAt]);

  const lightboxOptions = { theme: lightbox, allowDownload: model.settings.allowDownload, selectable: Boolean(selection) };
  // `index` points into `model.photos`; the lightbox walks every photo, cover included.
  const open = (index: number) => {
    const id = model.photos[index]?.id;
    openLightbox(lightboxPhotos(model), Math.max(0, model.allPhotos.findIndex((photo) => photo.id === id)), lightboxOptions);
  };
  const review = (photoIds: string[]) => {
    const ids = new Set(photoIds);
    openLightbox(
      lightboxPhotos(model).filter((photo) => ids.has(photo.id)),
      0,
      lightboxOptions,
    );
  };

  const downloadAll = async () => {
    if (zipping) return;
    if (!model.settings.allowDownload) return;
    if (!model.allPhotos.length) {
      toast("Album này chưa có ảnh nào.", "info");
      return;
    }
    zipping = true;
    cancelled.current = false;
    setProgress({ done: 0, total: model.allPhotos.length });
    try {
      const result = await downloadAlbumZip({ slug: model.slug, photos: model.allPhotos }, {
        isCancelled: () => cancelled.current,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      if (result.cancelled) toast("Đã hủy tải về", "info");
      else if (result.failed) toast(`Đã lưu file zip. Không tải được ${result.failed} ảnh.`, "info");
      else toast("Đã tải album về máy");
    } catch {
      toast("Không thể chuẩn bị tệp tải về.", "error");
    } finally {
      setProgress(null);
      zipping = false;
    }
  };

  return (
    <GalleryContext.Provider value={{ model, open, downloadAll }}>
      <div id="template-root" className={className}>
        {children}
        {selection ? <SelectionBar onReview={review} /> : null}
      </div>
      {progress &&
        createPortal(
          <div className="fixed inset-0 z-[75] grid place-items-center bg-black/50 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-[#191827]" role="dialog" aria-modal="true">
              <p className="font-semibold">Đang chuẩn bị tệp tải về</p>
              <p className="mt-1 text-sm text-[#77758A]">
                {progress.done} / {progress.total} ảnh
              </p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#EBEAF1]">
                <div className="h-full w-0 bg-[#191827] transition-[width]" style={progress.done ? { width: `${Math.round((progress.done / progress.total) * 100)}%` } : undefined} />
              </div>
              <button
                type="button"
                onClick={() => {
                  cancelled.current = true;
                }}
                className={`${ui.secondary} mt-5 w-full`}
              >
                Hủy
              </button>
            </div>
          </div>,
          document.body,
        )}
    </GalleryContext.Provider>
  );
}

// In-page anchor: "top" scrolls to the top of the page, anything else to that element id.
export function ScrollLink({ to, className, label, children }: { to: string; className?: string; label?: string; children: ReactNode }) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = to === "top" ? null : document.getElementById(to);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <a href={to === "top" ? "#" : `#${to}`} onClick={onClick} className={className} aria-label={label}>
      {children}
    </a>
  );
}
