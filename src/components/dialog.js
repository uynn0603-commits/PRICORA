import { esc } from "../utils/format.js";
import { ui } from "../utils/ui.js";

export function confirmDialog({ title, message, confirmText = "Xác nhận", danger = false }) {
  return new Promise((resolve) => {
    const wrap = document.createElement("div");
    wrap.className = "fixed inset-0 z-[75] grid place-items-center bg-ink/40 px-4";
    wrap.innerHTML = `
      <div class="w-full max-w-md rounded-2xl bg-white p-6" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title" class="text-lg font-semibold tracking-tight">${esc(title)}</h2>
        <p class="mt-2 text-sm leading-relaxed text-mist">${esc(message)}</p>
        <div class="mt-6 flex justify-end gap-2">
          <button type="button" data-cancel class="${ui.secondary}">Hủy</button>
          <button type="button" data-ok class="${danger ? ui.danger : ui.primary}">${esc(confirmText)}</button>
        </div>
      </div>`;
    const finish = (value) => {
      document.removeEventListener("keydown", onKey);
      wrap.remove();
      if (!document.getElementById("lightbox") && !document.getElementById("modal")) {
        document.body.style.overflow = "";
      }
      resolve(value);
    };
    const onKey = (event) => {
      if (event.key === "Escape") finish(false);
    };
    wrap.querySelector("[data-cancel]").addEventListener("click", () => finish(false));
    wrap.querySelector("[data-ok]").addEventListener("click", () => finish(true));
    wrap.addEventListener("click", (event) => {
      if (event.target === wrap) finish(false);
    });
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    document.getElementById("portal").appendChild(wrap);
    wrap.querySelector("[data-ok]").focus();
  });
}

export function closeTransient() {
  document.querySelectorAll("#portal > .fixed").forEach((node) => {
    if (node.id !== "toasts") node.remove();
  });
  document.body.style.overflow = "";
}

