"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { getAlbum, getNotifications, getSession, isNotificationRead, markAllNotificationsRead, markNotificationRead } from "@/lib/store";
import { cn, initials } from "@/lib/format";
import { toast } from "@/lib/overlay";
import { Icon } from "../ui/Icon";

interface Crumb {
  label: string;
  href?: string;
}

function breadcrumb(path: string): Crumb[] {
  const items: Crumb[] = [{ label: "Tổng quan", href: "/admin" }];
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

export function Header({ path, onOpenMenu, onAvatar }: { path: string; onOpenMenu: () => void; onAvatar: (anchor: Element) => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const name = getSession()?.name || "";
  const notes = getNotifications();
  const unread = notes.filter((note) => !isNotificationRead(note.id)).length;
  const crumbs = breadcrumb(path);
  const [query, setQuery] = useState(params.get("q") || "");
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(params.get("q") || "");
  }, [params]);

  useEffect(() => {
    if (!panelOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      setPanelOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [panelOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-white/90 px-4 backdrop-blur md:gap-3 md:px-6">
      <button type="button" onClick={onOpenMenu} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink hover:bg-canvas lg:hidden" aria-label="Mở menu">
        <Icon name="menu" className="h-5 w-5" />
      </button>
      <nav className="mr-auto hidden min-w-0 items-center gap-1 text-sm md:flex" aria-label="Điều hướng">
        {crumbs.map((item, index) => {
          const last = index === crumbs.length - 1;
          const label = <span className="max-w-[160px] truncate">{item.label}</span>;
          return (
            <Fragment key={`${item.label}-${index}`}>
              {last || !item.href ? (
                <span className={last ? "font-semibold text-ink" : "text-mist"}>{label}</span>
              ) : (
                <Link href={item.href} className="text-mist hover:text-ink">
                  {label}
                </Link>
              )}
              {last ? null : (
                <span className="text-mist/70">
                  <Icon name="chevron-right" className="h-3.5 w-3.5" />
                </span>
              )}
            </Fragment>
          );
        })}
      </nav>
      <form
        className="min-w-0 flex-1 md:max-w-xs md:flex-none"
        onSubmit={(event) => {
          event.preventDefault();
          const value = query.trim();
          router.push(value ? `/admin/albums?q=${encodeURIComponent(value)}` : "/admin/albums");
        }}
      >
        <label className="relative block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist">
            <Icon name="search" />
          </span>
          <input
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm album"
            className="h-10 w-full rounded-xl border border-line bg-canvas pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
          />
        </label>
      </form>
      <div className="relative" ref={panelRef}>
        <button type="button" onClick={() => setPanelOpen((value) => !value)} className="relative grid h-10 w-10 place-items-center rounded-xl text-ink hover:bg-canvas" aria-label="Thông báo">
          <Icon name="bell" className="h-[18px] w-[18px]" />
          {unread ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-secondary" /> : null}
        </button>
        {panelOpen ? (
          <div className="absolute right-0 top-12 w-[min(100vw-2rem,340px)] rounded-2xl border border-line bg-white p-2 shadow-[0_16px_40px_rgba(25,24,39,0.12)]">
            <div className="flex items-center justify-between px-2 py-1.5">
              <p className="text-sm font-semibold">Thông báo</p>
              <button
                type="button"
                className="text-xs font-semibold text-primary"
                onClick={() => {
                  markAllNotificationsRead(notes.map((note) => note.id));
                  toast("Đã đánh dấu tất cả thông báo là đã đọc");
                }}
              >
                Đánh dấu đã đọc
              </button>
            </div>
            <div className="mt-1 max-h-80 overflow-y-auto">
              {notes.length ? (
                notes.map((note) => (
                  <Link
                    key={note.id}
                    href={note.href}
                    onClick={() => {
                      markNotificationRead(note.id);
                      setPanelOpen(false);
                    }}
                    className={cn("block rounded-xl px-2 py-2.5 hover:bg-canvas", isNotificationRead(note.id) && "opacity-60")}
                  >
                    <span className="block text-sm font-medium">{note.title}</span>
                    <span className="mt-0.5 block text-xs text-mist">{note.meta}</span>
                  </Link>
                ))
              ) : (
                <p className="px-2 py-6 text-center text-sm text-mist">Không có thông báo mới.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={(event) => onAvatar(event.currentTarget)}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-white"
        aria-label="Menu tài khoản"
      >
        {initials(name)}
      </button>
    </header>
  );
}
