import { icon } from "./icons.js";
import { esc } from "../utils/format.js";

export function toast(message, type = "success") {
  const portal = document.getElementById("portal");
  if (!portal) return;
  let stack = document.getElementById("toasts");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toasts";
    stack.className = "pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(100%-2rem,380px)] flex-col gap-2";
    portal.appendChild(stack);
  }
  const tone = type === "error" ? "text-rose-600" : type === "info" ? "text-primary" : "text-emerald-600";
  const name = type === "error" ? "circle-alert" : type === "info" ? "info" : "circle-check";
  const item = document.createElement("div");
  item.className =
    "pointer-events-auto flex items-start gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-[0_12px_40px_rgba(25,24,39,0.12)]";
  item.setAttribute("role", "status");
  item.innerHTML = `<span class="mt-0.5 ${tone}">${icon(name, "h-4 w-4")}</span><p class="text-sm font-medium leading-5 text-ink">${esc(message)}</p>`;
  stack.appendChild(item);
  setTimeout(() => {
    item.style.transition = "opacity .2s ease";
    item.style.opacity = "0";
    setTimeout(() => item.remove(), 200);
  }, 3400);
}
