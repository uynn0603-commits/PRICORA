import { downloadPhoto } from "../../utils/download.js";
import { frameLabel } from "../../utils/format.js";
import { onCleanup } from "../../utils/lifecycle.js";
import { icon } from "../icons.js";
import { toast } from "../toast.js";

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

let detach = () => {};
let state = null;

export function closeLightbox() {
  detach();
  detach = () => {};
  state = null;
}

function paint() {
  const root = document.getElementById("lightbox");
  if (!root || !state) return;
  const photo = state.photos[state.index];
  const image = root.querySelector("[data-image]");
  image.src = photo.src || "";
  image.alt = photo.name || "";
  root.querySelector("[data-count]").textContent = frameLabel(state.index, state.photos.length);
  root.querySelector("[data-prev]").disabled = state.index === 0;
  root.querySelector("[data-next]").disabled = state.index === state.photos.length - 1;
  const upcoming = state.photos[state.index + 1];
  if (upcoming?.src) {
    const preload = new Image();
    preload.src = upcoming.src;
  }
}

export function openLightbox(photos, index = 0, { theme = "dark", allowDownload = true } = {}) {
  closeLightbox();
  if (!photos.length) return;
  const look = THEMES[theme] || THEMES.dark;
  state = { photos, index: Math.max(0, Math.min(index, photos.length - 1)) };
  const root = document.createElement("div");
  root.id = "lightbox";
  root.className = `fixed inset-0 z-[70] flex flex-col ${look.root}`;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.innerHTML = `
    <div class="flex items-center justify-between px-3 py-3 sm:px-5">
      <p data-count class="min-w-16 text-sm font-medium tabular-nums tracking-wide ${look.count}"></p>
      <div class="flex items-center gap-1">
        ${
          allowDownload
            ? `<button type="button" data-download class="grid h-11 w-11 place-items-center rounded-full ${look.control}" aria-label="Tải ảnh">${icon("download", "h-5 w-5")}</button>`
            : ""
        }
        <button type="button" data-close class="grid h-11 w-11 place-items-center rounded-full ${look.control}" aria-label="Đóng">${icon("x", "h-5 w-5")}</button>
      </div>
    </div>
    <div class="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-6 sm:px-20" data-stage>
      <button type="button" data-prev class="absolute left-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full disabled:opacity-25 sm:left-5 ${look.nav}" aria-label="Ảnh trước">${icon("chevron-left", "h-6 w-6")}</button>
      <img data-image alt="" class="max-h-full max-w-full object-contain" />
      <button type="button" data-next class="absolute right-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full disabled:opacity-25 sm:right-5 ${look.nav}" aria-label="Ảnh tiếp theo">${icon("chevron-right", "h-6 w-6")}</button>
    </div>`;
  document.getElementById("portal").appendChild(root);
  document.body.style.overflow = "hidden";

  const step = (delta) => {
    const next = state.index + delta;
    if (next < 0 || next >= state.photos.length) return;
    state.index = next;
    paint();
  };
  const onKey = (event) => {
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
  let startX = 0;
  const stage = root.querySelector("[data-stage]");
  stage.addEventListener("touchstart", (event) => {
    startX = event.changedTouches[0].clientX;
  }, { passive: true });
  stage.addEventListener("touchend", (event) => {
    const delta = event.changedTouches[0].clientX - startX;
    if (delta > 48) step(-1);
    if (delta < -48) step(1);
  }, { passive: true });
  root.querySelector("[data-close]").addEventListener("click", closeLightbox);
  root.querySelector("[data-prev]").addEventListener("click", () => step(-1));
  root.querySelector("[data-next]").addEventListener("click", () => step(1));
  root.querySelector("[data-download]")?.addEventListener("click", async () => {
    const saved = await downloadPhoto(state.photos[state.index]);
    toast(saved ? "Đã tải ảnh" : "Đã mở ảnh để bạn lưu về máy.", saved ? "success" : "info");
  });
  document.addEventListener("keydown", onKey);
  detach = () => {
    document.removeEventListener("keydown", onKey);
    root.remove();
    document.body.style.overflow = "";
  };
  onCleanup(closeLightbox);
  paint();
  root.querySelector("[data-close]").focus();
}
