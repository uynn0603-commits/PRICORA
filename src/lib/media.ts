import type { Album, Photo } from "./types";

export const BROKEN_IMAGE = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="100%" height="100%" fill="#F8F8FC"/><text x="50%" y="50%" fill="#77758A" font-family="sans-serif" font-size="22" text-anchor="middle">Ảnh không khả dụng</text></svg>',
)}`;

// `ratio` (width / height) lets a template request a specific framing; remote photos are
// cropped server-side so the browser never downloads pixels the layout will hide.
export function photoSrc(photo: Photo | null | undefined, width = 900, ratio?: number): string {
  if (!photo) return "";
  if (photo.dataUrl) return photo.dataUrl;
  if (photo.url && !photo.unsplash) {
    if (width <= THUMB_EDGE && photo.thumb) return photo.thumb;
    return photo.preview || photo.url;
  }
  if (!photo.unsplash) return "";
  const aspect = ratio || (photo.w || 4) / (photo.h || 3);
  const height = Math.max(1, Math.round(width / aspect));
  const crop = photo.fp || "entropy";
  return `https://images.unsplash.com/${photo.unsplash}?auto=format&fit=crop&w=${width}&h=${height}&q=75&crop=${crop}`;
}

// Full-resolution file, for downloads.
export function originalSrc(photo: Photo): string {
  return photo.url && !photo.unsplash ? photo.url : photoSrc(photo, 2400);
}

// srcset for uploaded photos that have resized copies; Unsplash photos build their own.
export function variantSrcSet(photo: Photo): string {
  if (photo.unsplash || !photo.url) return "";
  const long = Math.max(photo.w || 0, photo.h || 0);
  const scale = (edge: number) => Math.round((Math.min(edge, long) / long) * (photo.w || long));
  const entries: string[] = [];
  if (photo.thumb) entries.push(`${photo.thumb} ${scale(THUMB_EDGE)}w`);
  if (photo.preview) entries.push(`${photo.preview} ${scale(PREVIEW_EDGE)}w`);
  return entries.length && long ? entries.join(", ") : "";
}

export function coverSrc(album: Pick<Album, "coverDataUrl" | "coverId" | "photos"> | null | undefined, width = 1600): string {
  if (!album) return "";
  if (album.coverDataUrl) return album.coverDataUrl;
  const chosen = album.photos?.find((photo) => photo.id === album.coverId);
  const photo = chosen || album.photos?.[0];
  return photo ? photoSrc(photo, width) : "";
}

export function measureImage(url: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ w: image.naturalWidth || 4, h: image.naturalHeight || 3 });
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

export const PREVIEW_EDGE = 2048;
export const THUMB_EDGE = 1024;

export interface ImageVariants {
  w: number;
  h: number;
  preview: Blob | null;
  thumb: Blob | null;
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

function resized(source: CanvasImageSource, width: number, height: number, edge: number): HTMLCanvasElement {
  const scale = Math.min(1, edge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Decoding a 50 MP photo takes hundreds of MB, so resizes run one at a time even when
// several uploads are in flight.
let resizeQueue: Promise<unknown> = Promise.resolve();

// Measures the photo and makes the smaller copies galleries load instead of the original.
// Resolves null when the browser cannot decode the file at all.
export function makeVariants(file: File): Promise<ImageVariants | null> {
  const run = resizeQueue.then(async (): Promise<ImageVariants | null> => {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      const url = URL.createObjectURL(file);
      const size = await measureImage(url);
      URL.revokeObjectURL(url);
      return size && { ...size, preview: null, thumb: null };
    }
    const { width, height } = bitmap;
    const long = Math.max(width, height);
    try {
      if (long <= THUMB_EDGE) return { w: width, h: height, preview: null, thumb: null };
      const previewCanvas = resized(bitmap, width, height, PREVIEW_EDGE);
      const preview = long > PREVIEW_EDGE ? await toJpeg(previewCanvas, 0.82) : null;
      const thumb = await toJpeg(resized(previewCanvas, previewCanvas.width, previewCanvas.height, THUMB_EDGE), 0.8);
      return { w: width, h: height, preview, thumb };
    } catch {
      return { w: width, h: height, preview: null, thumb: null };
    } finally {
      bitmap.close();
    }
  });
  resizeQueue = run.catch(() => null);
  return run;
}

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
