import { downloadAlbumZip } from "../../utils/download.js";
import { onCleanup } from "../../utils/lifecycle.js";
import { ui } from "../../utils/ui.js";
import { toast } from "../toast.js";
import { lightboxPhotos } from "./model.js";
import { openLightbox } from "./PhotoLightbox.js";

// Wires the behaviour every template shares: opening the lightbox, downloading the
// album and in-page anchors. Templates only provide markup with data-* hooks.
export function bindGallery(model, { lightbox = "dark", pageBg } = {}) {
  const root = document.getElementById("template-root");
  if (!root) return;
  if (pageBg) {
    const previous = document.body.style.backgroundColor;
    document.body.style.backgroundColor = pageBg;
    onCleanup(() => {
      document.body.style.backgroundColor = previous;
    });
  }
  root.addEventListener("click", (event) => {
    const opener = event.target.closest("[data-open]");
    if (opener) {
      openLightbox(lightboxPhotos(model), Number(opener.dataset.open), {
        theme: lightbox,
        allowDownload: model.settings.allowDownload,
      });
      return;
    }
    if (event.target.closest("[data-download-all]")) {
      startZip(model);
      return;
    }
    const anchor = event.target.closest("[data-scroll]");
    if (anchor) {
      event.preventDefault();
      const target = anchor.dataset.scroll === "top" ? null : document.getElementById(anchor.dataset.scroll);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
}

let zipping = false;

async function startZip(model) {
  if (zipping) return;
  if (!model.settings.allowDownload) return;
  if (!model.photos.length) {
    toast("Album này chưa có ảnh nào.", "info");
    return;
  }
  zipping = true;
  let cancelled = false;
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 z-[75] grid place-items-center bg-black/50 px-4";
  overlay.innerHTML = `
    <div class="w-full max-w-sm rounded-2xl bg-white p-6 text-[#191827]" role="dialog" aria-modal="true">
      <p class="font-semibold">Đang chuẩn bị tệp tải về</p>
      <p id="zip-label" class="mt-1 text-sm text-[#77758A]">0 / ${model.photos.length} ảnh</p>
      <div class="mt-4 h-1.5 overflow-hidden rounded-full bg-[#EBEAF1]"><div id="zip-bar" class="h-full w-0 bg-[#191827] transition-[width]"></div></div>
      <button type="button" id="zip-cancel" class="${ui.secondary} mt-5 w-full">Hủy</button>
    </div>`;
  document.getElementById("portal").appendChild(overlay);
  overlay.querySelector("#zip-cancel").addEventListener("click", () => {
    cancelled = true;
  });
  try {
    const result = await downloadAlbumZip(model, {
      isCancelled: () => cancelled,
      onProgress: (done, total) => {
        const label = overlay.querySelector("#zip-label");
        const bar = overlay.querySelector("#zip-bar");
        if (label) label.textContent = `${done} / ${total} ảnh`;
        if (bar) bar.style.width = `${Math.round((done / total) * 100)}%`;
      },
    });
    if (result.cancelled) toast("Đã hủy tải về", "info");
    else if (result.failed) toast(`Đã lưu file zip. Không tải được ${result.failed} ảnh.`, "info");
    else toast("Đã tải album về máy");
  } catch {
    toast("Không thể chuẩn bị tệp tải về.", "error");
  } finally {
    overlay.remove();
    zipping = false;
  }
}
