import { currentStudio, getPlan, getSession, studiosForUser } from "../data/store.js";
import { esc, initials } from "../utils/format.js";
import { icon } from "./icons.js";
import { logoLockup, studioMark } from "./logo.js";

const ITEMS = [
  { href: "/admin", label: "Tổng quan", icon: "layout-dashboard", exact: true },
  { href: "/admin/albums", label: "Album", icon: "images" },
  { href: "/admin/storage", label: "Lưu trữ", icon: "hard-drive" },
  { href: "/admin/settings", label: "Cài đặt", icon: "settings" },
];

function active(item, path) {
  if (item.exact) return path === "/admin" || path === "/admin/";
  return path === item.href || path.startsWith(`${item.href}/`);
}

export function renderSidebar(path) {
  const session = getSession();
  const studio = currentStudio();
  const plan = getPlan(studio);
  const switchable = session ? studiosForUser(session.user.id).length > 1 || session.user.platformAdmin : false;
  return `
    <aside id="sidebar" class="sidebar-panel fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-line bg-white">
      <a data-link href="/admin" class="flex h-16 items-center border-b border-line px-5">${logoLockup({ size: 32 })}</a>
      <div class="px-3 pt-4">
        <button type="button" id="studio-switch" class="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left ${switchable ? "hover:border-primary/40" : "cursor-default"}" ${switchable ? "" : 'aria-disabled="true"'}>
          ${studioMark(studio, 32)}
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold">${esc(studio?.name || "")}</span>
            <span class="block truncate text-xs text-mist">Gói ${esc(plan.name)}</span>
          </span>
          ${switchable ? icon("chevrons-up-down", "h-4 w-4 shrink-0 text-mist") : ""}
        </button>
      </div>
      <nav class="sidebar-scroll flex-1 space-y-1 overflow-y-auto px-3 py-4">
        ${ITEMS.map((item) => {
          const on = active(item, path);
          return `<a data-link href="${item.href}" ${on ? 'aria-current="page"' : ""} class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${
            on ? "bg-primary/10 text-primary" : "text-ink/80 hover:bg-canvas"
          }">${icon(item.icon, "h-[18px] w-[18px]")}<span>${item.label}</span></a>`;
        }).join("")}
      </nav>
      <div class="border-t border-line p-3">
        <a data-link href="/admin/settings?tab=account" class="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-canvas">
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-white">${esc(initials(session?.name || ""))}</span>
          <span class="min-w-0">
            <span class="block truncate text-sm font-semibold">${esc(session?.name || "")}</span>
            <span class="block truncate text-xs text-mist">${esc(session?.email || "")}</span>
          </span>
        </a>
        <button type="button" id="logout" class="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-mist hover:bg-canvas hover:text-ink">
          ${icon("log-out", "h-4 w-4")} Đăng xuất
        </button>
      </div>
    </aside>
    <button type="button" id="sidebar-backdrop" class="fixed inset-0 z-30 hidden bg-ink/30 lg:hidden" aria-label="Đóng menu"></button>`;
}
