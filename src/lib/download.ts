import { originalSrc } from "./media";
import type { Photo } from "./types";

export type DownloadablePhoto = Photo & { src?: string };

// `src` is the display copy; uploaded photos always download the original file.
function sourceOf(photo: DownloadablePhoto): string {
  if (photo.url && !photo.unsplash) return photo.url;
  return photo.src || originalSrc(photo);
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function fileName(photo: Photo, used: Set<string>): string {
  const raw = photo.name || "photo.jpg";
  if (!used.has(raw)) {
    used.add(raw);
    return raw;
  }
  const dot = raw.lastIndexOf(".");
  const base = dot > 0 ? raw.slice(0, dot) : raw;
  const ext = dot > 0 ? raw.slice(dot) : "";
  let index = 2;
  let next = `${base}-${index}${ext}`;
  while (used.has(next)) {
    index += 1;
    next = `${base}-${index}${ext}`;
  }
  used.add(next);
  return next;
}

export async function downloadPhoto(photo: DownloadablePhoto): Promise<boolean> {
  const src = sourceOf(photo);
  const name = photo.name || "photo.jpg";
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error("download failed");
    saveBlob(await response.blob(), name);
    return true;
  } catch {
    window.open(src, "_blank", "noopener,noreferrer");
    return false;
  }
}

async function fetchOne(photo: DownloadablePhoto): Promise<Blob> {
  const src = sourceOf(photo);
  const response = await fetch(src);
  if (!response.ok) throw new Error("fetch failed");
  return response.blob();
}

export interface ZipResult {
  cancelled: boolean;
  failed: number;
  total?: number;
}

export async function downloadAlbumZip(
  album: { slug?: string; photos: DownloadablePhoto[] },
  { onProgress, isCancelled }: { onProgress?: (done: number, total: number) => void; isCancelled?: () => boolean } = {},
): Promise<ZipResult> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const folder = zip.folder(album.slug || "album")!;
  const used = new Set<string>();
  const photos = [...album.photos];
  let cursor = 0;
  let done = 0;
  let failed = 0;

  async function worker() {
    while (cursor < photos.length) {
      if (isCancelled?.()) return;
      const index = cursor;
      cursor += 1;
      const photo = photos[index];
      const name = fileName(photo, used);
      try {
        const blob = await fetchOne(photo);
        folder.file(name, blob);
      } catch {
        failed += 1;
        folder.file(`${name}.txt`, `Không thể đóng gói ảnh này.\nMở ảnh gốc tại: ${sourceOf(photo)}\n`);
      }
      done += 1;
      onProgress?.(done, photos.length);
    }
  }

  const workers = Array.from({ length: Math.min(4, photos.length) }, () => worker());
  await Promise.all(workers);
  if (isCancelled?.()) return { cancelled: true, failed };
  const blob = await zip.generateAsync({ type: "blob" });
  saveBlob(blob, `${album.slug || "album"}.zip`);
  return { cancelled: false, failed, total: photos.length };
}
