"use client";

import type { ReactNode } from "react";
import { photoSrc } from "@/lib/media";
import type { Photo } from "@/lib/types";
import { useGallery } from "./GalleryActions";
import { responsiveSet } from "./GalleryHero";
import { PickButton } from "./SelectionBar";

// Wide frames (3:2 and wider) cut away half of a portrait or square photo, usually the
// faces. Templates check this before giving a photo a wide slot.
export function fitsWide(photo: Photo | undefined): boolean {
  return !photo || (photo.w || 4) / (photo.h || 3) >= 1.2;
}

// A clickable photo frame. `ratio` fixes the framing and the server-side crop; `aspect`
// swaps the inline ratio for responsive aspect classes. Without either, the photo keeps
// its own proportions.
export function Frame({
  index,
  ratio,
  aspect = "",
  width = 1200,
  sizes = "100vw",
  className = "",
  imgClass = "",
  overlay,
  eager = false,
}: {
  index: number;
  ratio?: number;
  aspect?: string;
  width?: number;
  sizes?: string;
  className?: string;
  imgClass?: string;
  overlay?: ReactNode;
  eager?: boolean;
}) {
  const { model, open } = useGallery();
  const photo = model.photos[index];
  if (!photo) return null;
  const natural = (photo.w || 4) / (photo.h || 3);
  const src = photoSrc(photo, width, ratio);
  const set = responsiveSet(photo, width, ratio);
  // The pick toggle sits beside the open button, not inside it: buttons cannot nest.
  return (
    <div className={`group relative block w-full overflow-hidden ${aspect} ${className}`} style={aspect ? undefined : { aspectRatio: ratio || natural }}>
      <button type="button" onClick={() => open(index)} aria-label={`Mở ảnh ${index + 1} trên ${model.photos.length}`} className="block h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          srcSet={set || undefined}
          sizes={set ? sizes : undefined}
          alt=""
          loading={eager ? undefined : "lazy"}
          decoding="async"
          draggable={false}
          className={`h-full w-full object-cover ${imgClass}`}
        />
        {overlay}
      </button>
      {model.selection ? <PickButton photoId={photo.id} /> : null}
    </div>
  );
}
