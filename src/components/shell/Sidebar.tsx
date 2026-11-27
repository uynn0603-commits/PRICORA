"use client";

import Link from "next/link";
import { currentStudio, getPlan, getSession, studiosForUser } from "@/lib/store";
import { cn } from "@/lib/format";
import { Icon } from "../ui/Icon";
import { UserAvatar } from "../ui/UserAvatar";
import { LogoLockup, StudioMark } from "../ui/Logo";

const ITEMS = [
  { href: "/admin", label: "Tổng quan", icon: "layout-dashboard", exact: true },
  { href: "/admin/albums", label: "Album", icon: "images" },
  { href: "/admin/invitations", label: "Thiệp", icon: "mail" },
  { href: "/admin/storage", label: "Lưu trữ", icon: "hard-drive" },
  { href: "/admin/settings", label: "Cài đặt", icon: "settings" },
];

function isActive(item: (typeof ITEMS)[number], path: string) {
  if (item.exact) return path === "/admin" || path === "/admin/";
  return path === item.href || path.startsWith(`${item.href}/`);
}

export function Sidebar({
  path,
  open,
  onClose,
  onSwitchStudio,
  onLogout,
}: {
  path: string;
  open: boolean;
  onClose: () => void;
  onSwitchStudio: (anchor: Element) => void;
  onLogout: () => void;
}) {
  const session = getSession();
  const studio = currentStudio();
  const plan = getPlan(studio);
  const switchable = session ? studiosForUser(session.user.id).length > 1 || Boolean(session.user.platformAdmin) : false;
  return (
    <>
      <aside className={cn("sidebar-panel fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-line bg-white", open && "is-open")}>
        <Link href="/admin" onClick={onClose} className="flex h-16 items-center border-b border-line px-5">
          <LogoLockup size={32} />
        </Link>
        <div className="px-3 pt-4">
          <button
            type="button"
            onClick={(event) => switchable && onSwitchStudio(event.currentTarget)}
            aria-disabled={switchable ? undefined : true}
            className={cn("flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left", switchable ? "hover:border-primary/40" : "cursor-default")}
          >
            <StudioMark studio={studio} size={32} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{studio?.name || ""}</span>
              <span className="block truncate text-xs text-mist">Gói {plan.name}</span>
            </span>
            {switchable ? <Icon name="chevrons-up-down" className="h-4 w-4 shrink-0 text-mist" /> : null}
          </button>
        </div>
        <nav className="sidebar-scroll flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {ITEMS.map((item) => {
            const on = isActive(item, path);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={on ? "page" : undefined}
                className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold", on ? "bg-primary/10 text-primary" : "text-ink/80 hover:bg-canvas")}
              >
                <Icon name={item.icon} className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-3">
          <Link href="/admin/settings?tab=account" onClick={onClose} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-canvas">
            <UserAvatar user={session?.user} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{session?.name || ""}</span>
              <span className="block truncate text-xs text-mist">{session?.email || ""}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-mist hover:bg-canvas hover:text-ink"
          >
            <Icon name="log-out" /> Đăng xuất
          </button>
        </div>
      </aside>
      {open ? <button type="button" onClick={onClose} className="fixed inset-0 z-30 bg-ink/30 lg:hidden" aria-label="Đóng menu" /> : null}
    </>
  );
}
