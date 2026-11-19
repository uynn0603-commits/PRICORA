import { icon } from "./icons.js";
import { ui } from "../utils/ui.js";

export function uploadZone() {
  return `
    <div id="dropzone" class="rounded-2xl border border-dashed border-line bg-white px-6 py-10 text-center transition">
      <div class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">${icon("upload", "h-5 w-5")}</div>
      <p class="mt-4 text-base font-semibold">Kéo thả ảnh vào đây</p>
      <p class="mx-auto mt-1 max-w-md text-sm leading-relaxed text-mist">JPG, JPEG, PNG hoặc WEBP. Chọn bao nhiêu ảnh tùy ý. Ảnh xem trước chỉ giữ trong phiên trình duyệt này và sẽ mất khi tải lại trang.</p>
      <label class="${ui.primary} mt-5 cursor-pointer">
        <input id="file-input" type="file" class="sr-only" multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" />
        ${icon("image-plus", "h-4 w-4")} Tải ảnh lên
      </label>
    </div>
    <ul id="upload-queue" class="mt-3 space-y-2"></ul>`;
}
