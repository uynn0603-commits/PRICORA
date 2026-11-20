import { photoSrc, variantSrcSet } from "@/lib/media";
import type { Photo } from "@/lib/types";
import { coverUrl, type GalleryModel } from "./model";

export function responsiveSet(photo: Photo | null | undefined, width: number, ratio?: number): string {
  if (!photo || photo.sessionOnly || photo.dataUrl) return "";
  if (!photo.unsplash) return variantSrcSet(photo);
  const steps = [640, 1080, 1600, 2400].filter((step) => step < width).concat(width);
  return steps.map((step) => `${photoSrc(photo, step, ratio)} ${step}w`).join(", ");
}

// Matches the `md` breakpoint templates use to switch to their phone layout.
const PHONE = "(max-width: 767px)";

export function CoverImage({
  model,
  width = 2400,
  ratio,
  className = "",
  alt = "",
}: {
  model: GalleryModel;
  width?: number;
  ratio?: number;
  className?: string;
  alt?: string;
}) {
  const src = coverUrl(model, width, ratio);
  if (!src) return <div className={`${className} bg-black/10`} />;
  const set = responsiveSet(model.coverPhoto, width, ratio);
  const mobile = model.mobileCoverPhoto;
  // Phone hero boxes are upright, so remote mobile covers are cropped to 3:4.
  const mobileSet = mobile ? responsiveSet(mobile, 1200, 3 / 4) || photoSrc(mobile, 1200, 3 / 4) : "";
  return (
    <picture>
      {mobileSet ? <source media={PHONE} srcSet={mobileSet} sizes="100vw" /> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        srcSet={set || undefined}
        sizes={set ? "100vw" : undefined}
        alt={alt}
        fetchPriority="high"
        decoding="async"
        className={`${className} object-cover`}
      />
    </picture>
  );
}
