import { icon } from "./icons.js";
import { esc } from "../utils/format.js";

let detach = () => {};

export function closeMenu() {
  detach();
  detach = () => {};
}

export function openMenu(anchor, items) {
  closeMenu();
  const menu = document.createElement("div");
  menu.id = "context-menu";
  menu.className =
    "fixed z-[60] w-52 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-[0_16px_40px_rgba(25,24,39,0.12)]";
  menu.innerHTML = items
    .map(
      (item, index) => `
        <button type="button" data-index="${index}" class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${
          item.danger ? "text-rose-600 hover:bg-rose-50" : "text-ink hover:bg-canvas"
        }">
          ${item.icon ? icon(item.icon, "h-4 w-4") : '<span class="w-4"></span>'}
          <span>${esc(item.label)}</span>
        </button>`,
    )
    .join("");
  document.getElementById("portal").appendChild(menu);
  const rect = anchor.getBoundingClientRect();
  const width = menu.offsetWidth;
  const height = menu.offsetHeight;
  let left = Math.min(rect.right - width, window.innerWidth - width - 8);
  left = Math.max(8, left);
  let top = rect.bottom + 6;
  if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 6);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;

  const onDoc = (event) => {
    if (menu.contains(event.target) || anchor.contains(event.target)) return;
    closeMenu();
  };
  const onKey = (event) => {
    if (event.key === "Escape") closeMenu();
  };
  const onReflow = () => closeMenu();
  setTimeout(() => document.addEventListener("click", onDoc), 0);
  document.addEventListener("keydown", onKey);
  window.addEventListener("resize", onReflow);
  window.addEventListener("scroll", onReflow, true);
  menu.addEventListener("click", (event) => {
    const button = event.target.closest("[data-index]");
    if (!button) return;
    const item = items[Number(button.dataset.index)];
    closeMenu();
    item?.onClick?.();
  });
  detach = () => {
    document.removeEventListener("click", onDoc);
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onReflow);
    window.removeEventListener("scroll", onReflow, true);
    menu.remove();
  };
}
