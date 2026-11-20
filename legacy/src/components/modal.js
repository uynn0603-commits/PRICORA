import { icon } from "./icons.js";
import { esc } from "../utils/format.js";
import { ui } from "../utils/ui.js";

export function closeModal() {
  document.getElementById("modal")?.remove();
  if (!document.getElementById("lightbox")) document.body.style.overflow = "";
}

export function openModal({ title, body, actions = [] }) {
  closeModal();
  const wrap = document.createElement("div");
  wrap.id = "modal";
  wrap.className = "fixed inset-0 z-[75] grid place-items-center bg-ink/40 px-4";
  wrap.innerHTML = `
    <div class="w-full max-w-md rounded-2xl bg-white p-6" role="dialog" aria-modal="true">
      <div class="flex items-start justify-between gap-4">
        <h2 class="text-lg font-semibold tracking-tight">${esc(title)}</h2>
        <button type="button" data-close class="grid h-8 w-8 place-items-center rounded-lg text-mist hover:bg-canvas" aria-label="Đóng">${icon("x", "h-4 w-4")}</button>
      </div>
      <div class="mt-3 text-sm leading-relaxed text-mist">${body}</div>
      <div class="mt-6 flex justify-end gap-2" data-actions></div>
    </div>`;
  const actionRow = wrap.querySelector("[data-actions]");
  const list = actions.length ? actions : [{ label: "Đóng", kind: "primary" }];
  list.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = action.kind === "primary" ? ui.primary : ui.secondary;
    button.textContent = action.label;
    button.addEventListener("click", () => {
      action.onClick?.();
      if (action.close !== false) closeModal();
    });
    actionRow.appendChild(button);
  });
  wrap.addEventListener("click", (event) => {
    if (event.target === wrap || event.target.closest("[data-close]")) closeModal();
  });
  document.body.style.overflow = "hidden";
  document.getElementById("portal").appendChild(wrap);
}
