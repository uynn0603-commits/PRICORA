import { getAlbum, getNotifications, getSession, getSettings, isNotificationRead } from "../data/store.js";
import { esc, initials } from "../utils/format.js";
import { icon } from "./icons.js";

function breadcrumb(path) {
  const items = [{ label: "Tổng quan", href: "/admin" }];
  if (path === "/admin" || path === "/admin/") return items;
  if (path.startsWith("/admin/albums")) {
    items.push({ label: "Album", href: "/admin/albums" });
    if (path.includes("/new")) items.push({ label: "Album mới" });
    const id = path.match(/\/admin\/albums\/([^/]+)/)?.[1];
    if (id && id !== "new") {
      const album = getAlbum(id);
      items.push({ label: album?.name || "Album", href: `/admin/albums/${id}/photos` });
      if (path.endsWith("/photos")) items.push({ label: "Ảnh" });
      if (path.endsWith("/edit")) items.push({ label: "Chỉnh sửa" });
      if (path.endsWith("/share")) items.push({ label: "Chia sẻ" });
      if (path.endsWith("/template")) items.push({ label: "Giao diện" });
    }
  } else if (path.startsWith("/admin/storage")) items.push({ label: "Lưu trữ" });
  else if (path.startsWith("/admin/settings")) items.push({ label: "Cài đặt" });
  return items;
}

export function renderHeader(path) {
  const session = getSession();
  const settings = getSettings();
  const name = session?.name || settings.accountName;
  const notes = getNotifications();
  const unread = notes.filter((note) => !isNotificationRead(note.id)).length;
  const query = new URLSearchParams(location.search).get("q") || "";
  const crumbs = breadcrumb(path);
  return `
    <header class="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-white/90 px-4 backdrop-blur md:gap-3 md:px-6">
      <button type="button" id="menu-toggle" class="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink hover:bg-canvas lg:hidden" aria-label="Mở menu">${icon("menu", "h-5 w-5")}</button>
      <nav class="mr-auto hidden min-w-0 items-center gap-1 text-sm md:flex" aria-label="Điều hướng">
        ${crumbs
          .map((item, index) => {
            const last = index === crumbs.length - 1;
            const label = `<span class="max-w-[160px] truncate">${esc(item.label)}</span>`;
            const node = last || !item.href ? `<span class="${last ? "font-semibold text-ink" : "text-mist"}">${label}</span>` : `<a data-link href="${item.href}" class="text-mist hover:text-ink">${label}</a>`;
            const sep = last ? "" : `<span class="text-mist/70">${icon("chevron-right", "h-3.5 w-3.5")}</span>`;
            return node + sep;
          })
          .join("")}
      </nav>
      <form id="global-search" class="min-w-0 flex-1 md:max-w-xs md:flex-none">
        <label class="relative block">
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist">${icon("search", "h-4 w-4")}</span>
          <input name="q" value="${esc(query)}" placeholder="Tìm album" class="h-10 w-full rounded-xl border border-line bg-canvas pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10" />
        </label>
      </form>
      <div class="relative">
        <button type="button" id="notice-btn" class="relative grid h-10 w-10 place-items-center rounded-xl text-ink hover:bg-canvas" aria-label="Thông báo">
          ${icon("bell", "h-[18px] w-[18px]")}
          ${unread ? `<span class="absolute right-2 top-2 h-2 w-2 rounded-full bg-secondary"></span>` : ""}
        </button>
        <div id="notice-panel" class="absolute right-0 top-12 hidden w-[min(100vw-2rem,340px)] rounded-2xl border border-line bg-white p-2 shadow-[0_16px_40px_rgba(25,24,39,0.12)]">
          <div class="flex items-center justify-between px-2 py-1.5">
            <p class="text-sm font-semibold">Thông báo</p>
            <button type="button" id="mark-read" class="text-xs font-semibold text-primary">Đánh dấu đã đọc</button>
          </div>
          <div class="mt-1 max-h-80 overflow-y-auto">
            ${
              notes.length
                ? notes
                    .map(
                      (note) => `
                        <a data-link data-note="${note.id}" href="${note.href}" class="block rounded-xl px-2 py-2.5 hover:bg-canvas ${
                          isNotificationRead(note.id) ? "opacity-60" : ""
                        }">
                          <span class="block text-sm font-medium">${esc(note.title)}</span>
                          <span class="mt-0.5 block text-xs text-mist">${esc(note.meta)}</span>
                        </a>`,
                    )
                    .join("")
                : '<p class="px-2 py-6 text-center text-sm text-mist">Không có thông báo mới.</p>'
            }
          </div>
        </div>
      </div>
      <button type="button" id="avatar-btn" class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-white" aria-label="Menu tài khoản">${esc(initials(name))}</button>
    </header>`;
}
