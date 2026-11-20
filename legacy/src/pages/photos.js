import { confirmDialog } from "../components/dialog.js";
import { openLightbox } from "../components/lightbox.js";
import { icon } from "../components/icons.js";
import { photoCard, uploadRow } from "../components/photo-card.js";
import { toast } from "../components/toast.js";
import { uploadZone } from "../components/upload-zone.js";
import { photoSrc } from "../data/media.js";
import {
  addPhotos,
  deletePhotos,
  galleryPath,
  getAlbum,
  movePhoto,
  reorderPhotos,
  setCover,
  sortPhotos,
} from "../data/store.js";
import { esc, plural } from "../utils/format.js";
import { onCleanup } from "../utils/lifecycle.js";
import { ui } from "../utils/ui.js";

let albumId = "";
let selected = new Set();
let queue = [];
let uploading = false;
let warned = false;
let dragId = "";

function album() {
  return getAlbum(albumId);
}

function paintGrid() {
  const current = album();
  if (!current) return;
  const grid = document.getElementById("photo-grid");
  grid.innerHTML = current.photos.length
    ? `<div class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">${current.photos
        .map((photo) => photoCard(photo, current, selected.has(photo.id)))
        .join("")}</div>`
    : `<div class="rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
        <p class="text-lg font-semibold">Chưa có ảnh nào</p>
        <p class="mt-2 text-sm text-mist">Hãy tải lên những ảnh đầu tiên của buổi chụp.</p>
      </div>`;
  const count = document.querySelector("[data-photo-count]");
  if (count) count.textContent = plural(current.photos.length, "photo");
  const box = document.getElementById("select-all");
  if (box) {
    box.checked = current.photos.length > 0 && selected.size === current.photos.length;
    box.indeterminate = selected.size > 0 && selected.size < current.photos.length;
  }
  const one = selected.size === 1;
  document.getElementById("delete-selected").disabled = selected.size === 0;
  document.getElementById("set-cover").disabled = !one;
  document.getElementById("move-earlier").disabled = !one;
  document.getElementById("move-later").disabled = !one;
  document.getElementById("selection-count").textContent = selected.size ? `Đã chọn ${selected.size}` : "Chưa chọn ảnh";
}

function paintQueue() {
  const list = document.getElementById("upload-queue");
  if (!list) return;
  if (!queue.length) {
    list.innerHTML = "";
    return;
  }
  const done = queue.filter((item) => item.status === "success").length;
  const failed = queue.filter((item) => item.status === "failed").length;
  const settled = done + failed === queue.length;
  list.innerHTML = `
    <li class="flex items-center justify-between px-1 pt-1 text-xs text-mist">
      <span>Đã tải ${done}/${queue.length}${failed ? ` · ${failed} lỗi` : ""}</span>
      ${settled ? '<button type="button" id="clear-queue" class="font-semibold text-primary">Xóa danh sách</button>' : ""}
    </li>
    ${queue.map(uploadRow).join("")}`;
}

export const photosPage = {
  title(route) {
    return `${getAlbum(route.params[0])?.name || "Ảnh"} · PICORA`;
  },
  render(route) {
    const current = getAlbum(route.params[0]);
    if (!current) {
      return `<div class="${ui.card} p-8"><h1 class="text-xl font-semibold">Không tìm thấy album</h1><a data-link href="/admin/albums" class="${ui.secondary} mt-4">Quay lại danh sách album</a></div>`;
    }
    return `
      <div id="photo-page">
        <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 class="text-[28px] font-semibold tracking-tight md:text-[32px]">${esc(current.name)}</h1>
            <p class="mt-2 text-sm text-mist">
              ${current.customerName && current.customerName !== current.name ? `${esc(current.customerName)} · ` : ""}<span data-photo-count>${plural(current.photos.length, "photo")}</span>
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <a data-link href="/admin/albums/${current.id}/share" class="${ui.secondary}">${icon("share-2", "h-4 w-4")} Chia sẻ</a>
            <a data-link href="${galleryPath(current)}" class="${ui.primary}">${icon("eye", "h-4 w-4")} Xem album</a>
          </div>
        </div>
        ${uploadZone()}
        <div class="z-20 -mx-4 mt-4 lg:sticky lg:top-16 border-y border-line bg-canvas/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 xl:-mx-8 xl:px-8">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex flex-wrap items-center gap-2">
              <label class="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-semibold">
                <input id="select-all" type="checkbox" class="h-4 w-4 accent-primary" /> Chọn tất cả
              </label>
              <span id="selection-count" class="px-1 text-sm text-mist">Chưa chọn ảnh</span>
              <span class="hidden h-6 w-px bg-line sm:block"></span>
              <button type="button" id="set-cover" class="${ui.secondary}" disabled>${icon("image", "h-4 w-4")} Đặt làm ảnh bìa</button>
              <span class="inline-flex">
                <button type="button" id="move-earlier" class="grid h-10 w-10 place-items-center rounded-l-xl border border-line bg-white text-ink hover:bg-canvas disabled:opacity-40" disabled aria-label="Chuyển lên trước" title="Chuyển lên trước">${icon("chevron-left", "h-4 w-4")}</button>
                <button type="button" id="move-later" class="-ml-px grid h-10 w-10 place-items-center rounded-r-xl border border-line bg-white text-ink hover:bg-canvas disabled:opacity-40" disabled aria-label="Chuyển ra sau" title="Chuyển ra sau">${icon("chevron-right", "h-4 w-4")}</button>
              </span>
              <button type="button" id="delete-selected" class="${ui.secondary} text-rose-600 hover:bg-rose-50" disabled>${icon("trash-2", "h-4 w-4")} Xóa</button>
            </div>
            <label class="relative block w-full lg:w-48">
              <select id="sort-photos" class="${ui.input} appearance-none pr-9">
                <option value="manual">Thứ tự tùy chỉnh</option>
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="name">Tên</option>
                <option value="size">Dung lượng lớn nhất</option>
              </select>
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mist">${icon("chevron-down", "h-4 w-4")}</span>
            </label>
          </div>
        </div>
        <div id="photo-grid" class="mt-4"></div>
      </div>`;
  },
  mount(route) {
    const current = getAlbum(route.params[0]);
    if (!current) return;
    albumId = current.id;
    selected = new Set();
    queue = [];
    paintGrid();

    const page = document.getElementById("photo-page");
    const zone = document.getElementById("dropzone");
    const input = document.getElementById("file-input");

    const handleFiles = async (files) => {
      if (!files?.length) return;
      if (uploading) {
        toast("Vui lòng chờ lượt tải hiện tại hoàn tất.", "info");
        return;
      }
      if (!warned) {
        warned = true;
        toast("Ảnh vừa tải lên chỉ giữ trong tab này và sẽ mất khi tải lại trang.", "info");
      }
      uploading = true;
      try {
        await addPhotos(albumId, files, (entry) => {
          const key = `${entry.file.name}-${entry.file.size}-${entry.file.lastModified}`;
          const row = {
            key,
            name: entry.file.name,
            status: entry.status,
            progress: entry.progress || 0,
            error: entry.error || "",
          };
          const index = queue.findIndex((item) => item.key === key);
          if (index === -1) queue.push(row);
          else queue[index] = row;
          paintQueue();
          if (entry.status === "success") paintGrid();
        });
      } finally {
        uploading = false;
        input.value = "";
      }
    };

    input.addEventListener("change", () => handleFiles(input.files));
    zone.addEventListener("dragover", (event) => {
      event.preventDefault();
      zone.classList.add("border-primary", "bg-primary/5");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("border-primary", "bg-primary/5"));
    zone.addEventListener("drop", (event) => {
      event.preventDefault();
      zone.classList.remove("border-primary", "bg-primary/5");
      handleFiles(event.dataTransfer?.files);
    });
    const prevent = (event) => event.preventDefault();
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);

    page.addEventListener("change", (event) => {
      if (event.target.id === "select-all") {
        const currentAlbum = album();
        selected = event.target.checked ? new Set(currentAlbum.photos.map((photo) => photo.id)) : new Set();
        paintGrid();
        return;
      }
      if (event.target.matches("[data-check]")) {
        const id = event.target.value;
        if (event.target.checked) selected.add(id);
        else selected.delete(id);
        paintGrid();
        return;
      }
      if (event.target.id === "sort-photos" && event.target.value !== "manual") {
        sortPhotos(albumId, event.target.value);
        event.target.value = "manual";
        toast("Đã cập nhật thứ tự ảnh");
        paintGrid();
      }
    });

    page.addEventListener("click", async (event) => {
      if (event.target.closest("#clear-queue")) {
        queue = [];
        paintQueue();
        return;
      }
      const preview = event.target.closest("[data-preview]");
      if (preview) {
        const currentAlbum = album();
        const photos = currentAlbum.photos.map((photo) => ({ ...photo, src: photoSrc(photo, 1800) }));
        const index = currentAlbum.photos.findIndex((photo) => photo.id === preview.dataset.preview);
        openLightbox(photos, Math.max(0, index));
        return;
      }
      if (event.target.closest("#delete-selected")) {
        const ids = [...selected];
        if (!ids.length) return;
        const ok = await confirmDialog({
          title: `Xóa ${ids.length} ảnh?`,
          message: "Ảnh bị xóa sẽ bị gỡ khỏi album này. Ảnh demo vừa tải lên cũng không thể khôi phục sau khi tải lại trang.",
          confirmText: "Xóa ảnh",
          danger: true,
        });
        if (!ok) return;
        deletePhotos(albumId, ids);
        selected.clear();
        toast("Đã xóa ảnh");
        paintGrid();
        return;
      }
      if (event.target.closest("#set-cover")) {
        const id = [...selected][0];
        if (!id) return;
        setCover(albumId, id);
        toast("Đã cập nhật ảnh bìa");
        paintGrid();
        return;
      }
      if (event.target.closest("#move-earlier")) {
        movePhoto(albumId, [...selected][0], -1);
        paintGrid();
        return;
      }
      if (event.target.closest("#move-later")) {
        movePhoto(albumId, [...selected][0], 1);
        paintGrid();
      }
    });

    page.addEventListener("dragstart", (event) => {
      const handle = event.target.closest("[data-drag]");
      if (!handle) return;
      dragId = handle.closest("[data-photo]")?.dataset.photo || "";
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", dragId);
    });
    page.addEventListener("dragover", (event) => {
      if (!event.target.closest("[data-photo]")) return;
      event.preventDefault();
    });
    page.addEventListener("drop", (event) => {
      const card = event.target.closest("[data-photo]");
      if (!card || !dragId) return;
      event.preventDefault();
      const currentAlbum = album();
      const ids = currentAlbum.photos.map((photo) => photo.id);
      const from = ids.indexOf(dragId);
      const to = ids.indexOf(card.dataset.photo);
      if (from < 0 || to < 0 || from === to) return;
      const [moved] = ids.splice(from, 1);
      ids.splice(to, 0, moved);
      reorderPhotos(albumId, ids);
      dragId = "";
      document.getElementById("sort-photos").value = "manual";
      paintGrid();
    });

    onCleanup(() => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    });
  },
};
