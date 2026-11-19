import {
  clearSession,
  getSession,
  markAllNotificationsRead,
  markNotificationRead,
  getNotifications,
  studiosForUser,
  switchStudio,
} from "../data/store.js";
import { navigate } from "../utils/router.js";
import { onCleanup } from "../utils/lifecycle.js";
import { renderHeader } from "./header.js";
import { openMenu } from "./menu.js";
import { renderSidebar } from "./sidebar.js";
import { toast } from "./toast.js";

export function renderShell({ path, content }) {
  return `
    <div class="min-h-screen bg-canvas text-ink">
      ${renderSidebar(path)}
      <div class="lg:pl-[250px]">
        ${renderHeader(path)}
        <main class="px-4 py-6 md:px-6 xl:px-8 xl:py-8">${content}</main>
      </div>
    </div>`;
}

export function bindShell() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");
  const open = () => {
    sidebar.classList.add("is-open");
    backdrop.classList.remove("hidden");
  };
  const close = () => {
    sidebar.classList.remove("is-open");
    backdrop.classList.add("hidden");
  };
  document.getElementById("menu-toggle")?.addEventListener("click", open);
  backdrop?.addEventListener("click", close);
  const onEscape = (event) => {
    if (event.key === "Escape" && sidebar?.classList.contains("is-open")) close();
  };
  document.addEventListener("keydown", onEscape);
  onCleanup(() => document.removeEventListener("keydown", onEscape));
  sidebar?.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));

  document.getElementById("logout")?.addEventListener("click", () => {
    clearSession();
    toast("Đã đăng xuất");
    navigate("/login");
  });

  document.getElementById("global-search")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("q").toString().trim();
    navigate(value ? `/admin/albums?q=${encodeURIComponent(value)}` : "/admin/albums");
  });

  const panel = document.getElementById("notice-panel");
  const noticeBtn = document.getElementById("notice-btn");
  noticeBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    panel?.classList.toggle("hidden");
  });
  const onDoc = (event) => {
    if (!panel || panel.classList.contains("hidden")) return;
    if (panel.contains(event.target) || noticeBtn.contains(event.target)) return;
    panel.classList.add("hidden");
  };
  document.addEventListener("click", onDoc);
  onCleanup(() => document.removeEventListener("click", onDoc));

  panel?.querySelectorAll("[data-note]").forEach((link) => {
    link.addEventListener("click", () => markNotificationRead(link.getAttribute("data-note")));
  });
  document.getElementById("mark-read")?.addEventListener("click", () => {
    markAllNotificationsRead(getNotifications().map((note) => note.id));
    toast("Đã đánh dấu tất cả thông báo là đã đọc");
    navigate(`${location.pathname}${location.search}`, { replace: true, keepScroll: true });
  });

  document.getElementById("studio-switch")?.addEventListener("click", (event) => {
    const session = getSession();
    if (!session) return;
    const items = studiosForUser(session.user.id)
      .filter((item) => item.studio.id !== session.studioId)
      .map((item) => ({
        label: item.studio.status === "active" ? item.studio.name : `${item.studio.name} (tạm khóa)`,
        icon: "building-2",
        onClick: () => {
          if (item.studio.status !== "active") {
            toast(`${item.studio.name} đang bị tạm khóa`, "error");
            return;
          }
          switchStudio(item.studio.id);
          toast(`Đã chuyển sang ${item.studio.name}`);
          navigate("/admin");
        },
      }));
    if (session.user.platformAdmin) items.push({ label: "Quản trị nền tảng", icon: "shield-check", onClick: () => navigate("/platform") });
    if (items.length) openMenu(event.currentTarget, items);
  });

  document.getElementById("avatar-btn")?.addEventListener("click", (event) => {
    const session = getSession();
    openMenu(event.currentTarget, [
      { label: session?.name || "Tài khoản", icon: "user-round", onClick: () => navigate("/admin/settings?tab=account") },
      { label: "Cài đặt", icon: "settings", onClick: () => navigate("/admin/settings") },
      {
        label: "Đăng xuất",
        icon: "log-out",
        danger: true,
        onClick: () => {
          clearSession();
          toast("Đã đăng xuất");
          navigate("/login");
        },
      },
    ]);
  });
}
