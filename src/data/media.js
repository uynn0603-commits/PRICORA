const memoryUrls = new Map();
const coverMemory = new Map();

export const BROKEN_IMAGE = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="100%" height="100%" fill="#F8F8FC"/><text x="50%" y="50%" fill="#77758A" font-family="sans-serif" font-size="22" text-anchor="middle">Ảnh không khả dụng</text></svg>',
)}`;

export function rememberUrl(id, url) {
  memoryUrls.set(id, url);
}

export function recallUrl(id) {
  return memoryUrls.get(id) || "";
}

export function forgetUrl(id) {
  const url = memoryUrls.get(id);
  if (url) URL.revokeObjectURL(url);
  memoryUrls.delete(id);
}

export function clearMemory() {
  memoryUrls.forEach((url) => URL.revokeObjectURL(url));
  memoryUrls.clear();
  coverMemory.forEach((url) => URL.revokeObjectURL(url));
  coverMemory.clear();
}

export function setCoverMemory(id, url) {
  const previous = coverMemory.get(id);
  if (previous && previous !== url) URL.revokeObjectURL(previous);
  coverMemory.set(id, url);
}

export function getCoverMemory(id) {
  return coverMemory.get(id) || "";
}

// `ratio` (width / height) lets a template request a specific framing; remote photos are
// cropped server-side so the browser never downloads pixels the layout will hide.
export function photoSrc(photo, width = 900, ratio) {
  if (!photo) return "";
  if (photo.sessionOnly) return memoryUrls.get(photo.id) || "";
  if (photo.dataUrl) return photo.dataUrl;
  if (photo.url && !photo.unsplash) return photo.url;
  if (!photo.unsplash) return "";
  const aspect = ratio || (photo.w || 4) / (photo.h || 3);
  const height = Math.max(1, Math.round(width / aspect));
  const crop = photo.fp || "entropy";
  return `https://images.unsplash.com/${photo.unsplash}?auto=format&fit=crop&w=${width}&h=${height}&q=75&crop=${crop}`;
}

export function coverSrc(album, width = 1600) {
  if (!album) return "";
  if (album.coverDataUrl) return album.coverDataUrl;
  if (album.coverSession) {
    const stored = coverMemory.get(album.id);
    if (stored) return stored;
  }
  const chosen = album.photos?.find((photo) => photo.id === album.coverId);
  const photo = chosen || album.photos?.[0];
  return photo ? photoSrc(photo, width) : "";
}

// Simulates network upload: progress advances on a timer and only completes
// once the file has been read locally and the simulated transfer has finished.
export function readFileWithProgress(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    let amount = 0;
    let result = null;
    const step = 0.06 + Math.random() * 0.05;
    const finish = () => {
      clearInterval(timer);
      onProgress?.(1);
      const blob = new Blob([result], { type: file.type || "image/jpeg" });
      resolve(URL.createObjectURL(blob));
    };
    const timer = setInterval(() => {
      amount = Math.min(0.96, amount + step);
      onProgress?.(amount);
      if (result && amount >= 0.96) finish();
    }, 80);
    reader.onload = () => {
      result = reader.result;
      if (amount >= 0.96) finish();
    };
    reader.onerror = () => {
      clearInterval(timer);
      reject(reader.error || new Error("Không đọc được tệp"));
    };
    reader.readAsArrayBuffer(file);
  });
}

export function measureImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ w: image.naturalWidth || 4, h: image.naturalHeight || 3 });
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

export function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
