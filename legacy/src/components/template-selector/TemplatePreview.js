import { esc } from "../../utils/format.js";
import { onCleanup } from "../../utils/lifecycle.js";
import { ui } from "../../utils/ui.js";
import { icon } from "../icons.js";
import { getTemplateMeta, listTemplates } from "../templates/index.js";
import { devicePreview, fitPhone } from "./DevicePreview.js";

let close = () => {};

export function closeTemplatePreview() {
  close();
  close = () => {};
}

// srcFor(templateId) decides which photos are shown: demo albums while creating, the
// album's own photos when changing an existing album's template.
export function openTemplatePreview({ templateId, srcFor, onSelect, selectLabel = "Chọn giao diện", selectedId }) {
  closeTemplatePreview();
  let current = templateId;
  let device = window.innerWidth < 768 ? "mobile" : "desktop";
  const root = document.createElement("div");
  root.className = "fixed inset-0 z-[65] flex flex-col bg-[#14131C]";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  document.getElementById("portal").appendChild(root);
  document.body.style.overflow = "hidden";

  const segment = (value, label, iconName) =>
    `<button type="button" data-device="${value}" class="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition ${device === value ? "bg-white text-ink" : "text-white/70 hover:text-white"}" aria-pressed="${device === value}">${icon(iconName, "h-3.5 w-3.5")}<span class="hidden sm:inline">${label}</span></button>`;

  const paint = () => {
    const meta = getTemplateMeta(current);
    const chosen = current === selectedId?.();
    root.innerHTML = `
      <div class="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2.5 text-white sm:px-5">
        <button type="button" data-close class="grid h-9 w-9 place-items-center rounded-lg text-white/80 hover:bg-white/10" aria-label="Đóng xem trước">${icon("x", "h-5 w-5")}</button>
        <div class="mr-auto min-w-0">
          <label class="sr-only" for="preview-template">Giao diện</label>
          <select id="preview-template" class="h-9 max-w-[52vw] rounded-lg border border-white/15 bg-transparent px-2 text-sm font-semibold text-white focus:outline-none [&>option]:text-ink">
            ${listTemplates().map((item) => `<option value="${item.id}" ${item.id === current ? "selected" : ""}>${esc(item.name)}</option>`).join("")}
          </select>
        </div>
        <div class="flex rounded-lg bg-white/10 p-0.5">${segment("desktop", "Máy tính", "monitor")}${segment("mobile", "Điện thoại", "smartphone")}</div>
        <a href="${esc(srcFor(current).replace(/[?&]embed=1/, ""))}" target="_blank" rel="noopener" class="hidden h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white/80 hover:bg-white/10 md:inline-flex">${icon("external-link", "h-3.5 w-3.5")} Mở trong tab mới</a>
        ${
          onSelect
            ? `<button type="button" data-select class="${chosen ? `${ui.secondary} border-white/20 bg-white/10 text-white hover:bg-white/15` : ui.primary} h-9 px-3 text-xs sm:px-4">${chosen ? `${icon("check", "h-4 w-4")} Đã chọn` : esc(selectLabel)}</button>`
            : ""
        }
      </div>
      <p class="shrink-0 px-5 pt-3 text-center text-xs text-white/50">${esc(meta.name)} · ${esc(meta.style.join(" · "))}</p>
      <div class="min-h-0 flex-1 p-3 sm:p-6">${devicePreview(srcFor(current), device)}</div>`;
    root.querySelector("[data-close]").addEventListener("click", closeTemplatePreview);
    root.querySelector("#preview-template").addEventListener("change", (event) => {
      current = event.target.value;
      paint();
    });
    root.querySelectorAll("[data-device]").forEach((button) =>
      button.addEventListener("click", () => {
        device = button.dataset.device;
        paint();
      }),
    );
    root.querySelector("[data-select]")?.addEventListener("click", () => {
      onSelect(current);
      paint();
    });
    fitPhone(root);
  };

  const onKey = (event) => {
    if (event.key === "Escape") closeTemplatePreview();
  };
  const onResize = () => fitPhone(root);
  document.addEventListener("keydown", onKey);
  window.addEventListener("resize", onResize);
  close = () => {
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onResize);
    root.remove();
    document.body.style.overflow = "";
  };
  onCleanup(closeTemplatePreview);
  paint();
  root.querySelector("[data-close]").focus();
}
