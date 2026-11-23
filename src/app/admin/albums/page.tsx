"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlbumGrid, AlbumList, type AlbumMoreHandler } from "@/components/albums/AlbumCard";
import { PageHeader } from "@/components/ui/fields";
import { Icon } from "@/components/ui/Icon";
import { statusLabel } from "@/components/ui/StatusBadge";
import { cn, parseISODate } from "@/lib/format";
import { confirmDialog, openMenu, toast } from "@/lib/overlay";
import { deleteAlbum, effectiveStatus, galleryPath, getAlbum, getAlbums, updateAlbum } from "@/lib/store";
import type { Album } from "@/lib/types";
import { ui } from "@/lib/ui";
import { useStore, useTitle } from "@/lib/use-store";

const PAGE_SIZE = 6;
const VIEW_KEY = "view.albumView";

type View = "grid" | "list";

interface Filters {
  q: string;
  status: string;
  range: string;
  page: number;
}

function readFilters(params: URLSearchParams): Filters {
  return {
    q: params.get("q") || "",
    status: params.get("status") || "all",
    range: params.get("range") || "all",
    page: Math.max(1, Number(params.get("page") || 1)),
  };
}

function filterQuery(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.range !== "all") params.set("range", filters.range);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

function inRange(album: Album, range: string) {
  if (!range || range === "all") return true;
  const date = parseISODate(album.shootingDate);
  if (!date) return false;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (range === "30") start.setDate(start.getDate() - 30);
  if (range === "90") start.setDate(start.getDate() - 90);
  if (range === "year") start.setMonth(0, 1);
  return date >= start && date <= end;
}

function filteredAlbums(filters: Filters) {
  const query = filters.q.trim().toLowerCase();
  return getAlbums().filter((album) => {
    const status = effectiveStatus(album);
    if (filters.status !== "all" && status !== filters.status) return false;
    if (!inRange(album, filters.range)) return false;
    if (!query) return true;
    const haystack = `${album.name} ${album.customerName} ${album.occasion} ${album.slug}`.toLowerCase();
    return haystack.includes(query);
  });
}

export default function AlbumsPage() {
  useStore();
  useTitle("Album · PICORA");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => readFilters(new URLSearchParams(searchParams.toString())));
  const [view, setView] = useState<View>(() => (localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid"));
  const written = useRef(searchParams.toString());

  // Filters live in the URL without a navigation; outside navigations (header search,
  // "Xóa bộ lọc") replace the local state.
  useEffect(() => {
    const incoming = searchParams.toString();
    if (incoming === written.current) return;
    written.current = incoming;
    setFilters(readFilters(new URLSearchParams(incoming)));
  }, [searchParams]);

  const writeFilters = (next: Filters) => {
    setFilters(next);
    const query = filterQuery(next);
    written.current = query;
    window.history.replaceState(null, "", query ? `/admin/albums?${query}` : "/admin/albums");
  };

  const all = filteredAlbums(filters);
  const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const pageNumber = Math.min(filters.page, pages);

  useEffect(() => {
    if (pageNumber !== filters.page) writeFilters({ ...filters, page: pageNumber });
  });

  const slice = all.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE);
  const from = all.length ? (pageNumber - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(pageNumber * PAGE_SIZE, all.length);

  const chooseView = (next: View) => {
    localStorage.setItem(VIEW_KEY, next);
    setView(next);
  };

  const onMore: AlbumMoreHandler = (target, anchor) => {
    const album = getAlbum(target.id);
    if (!album) return;
    const status = effectiveStatus(album);
    openMenu(anchor, [
      { label: "Xem album", icon: "eye", onClick: () => router.push(galleryPath(album)) },
      { label: "Chỉnh sửa", icon: "pencil", onClick: () => router.push(`/admin/albums/${album.id}/edit`) },
      { label: "Quản lý ảnh", icon: "images", onClick: () => router.push(`/admin/albums/${album.id}/photos`) },
      { label: "Đổi giao diện", icon: "layout-template", onClick: () => router.push(`/admin/albums/${album.id}/template`) },
      { label: "Chia sẻ", icon: "share-2", onClick: () => router.push(`/admin/albums/${album.id}/share`) },
      status === "hidden" || status === "draft"
        ? {
            label: "Xuất bản",
            icon: "circle-check",
            onClick: () => {
              updateAlbum(album.id, { status: "published" });
              const next = effectiveStatus(getAlbum(album.id));
              toast(next === "expired" ? "Đã xuất bản, nhưng ngày hết hạn đã qua." : "Đã xuất bản album");
            },
          }
        : {
            label: "Ẩn",
            icon: "eye-off",
            onClick: () => {
              updateAlbum(album.id, { status: "hidden" });
              toast("Đã ẩn album với khách hàng");
            },
          },
      {
        label: "Xóa",
        icon: "trash-2",
        danger: true,
        onClick: async () => {
          const ok = await confirmDialog({
            title: `Xóa ${album.name}?`,
            message: "Album và toàn bộ ảnh sẽ bị xóa khỏi thư viện của studio.",
            confirmText: "Xóa album",
            danger: true,
          });
          if (!ok) return;
          deleteAlbum(album.id);
          toast("Đã xóa album");
        },
      },
    ]);
  };

  const viewButton = (value: View, label: string, iconName: string) => (
    <button
      type="button"
      onClick={() => chooseView(value)}
      className={cn("grid h-9 w-10 place-items-center rounded-lg", view === value ? "bg-canvas text-ink" : "text-mist")}
      aria-label={label}
    >
      <Icon name={iconName} className="h-4 w-4" />
    </button>
  );

  return (
    <>
      <PageHeader
        title="Album của tôi"
        description="Tạo một album cho mỗi khách hàng, sau đó chia sẻ bằng liên kết riêng."
        actions={
          <Link href="/admin/albums/new" className={ui.primary}>
            <Icon name="plus" className="h-4 w-4" /> Tạo album
          </Link>
        }
      />
      <div>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist">
              <Icon name="search" className="h-4 w-4" />
            </span>
            <input
              value={filters.q}
              onChange={(event) => writeFilters({ ...filters, q: event.target.value, page: 1 })}
              placeholder="Tìm theo tên album hoặc khách hàng"
              className={cn(ui.input, "pl-9")}
            />
          </label>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <span className="relative">
              <select
                value={filters.status}
                onChange={(event) => writeFilters({ ...filters, status: event.target.value, page: 1 })}
                className={cn(ui.input, "w-full appearance-none pr-9 sm:w-40")}
              >
                {["all", "published", "draft", "hidden", "expired"].map((status) => (
                  <option key={status} value={status}>
                    {status === "all" ? "Tất cả trạng thái" : statusLabel(status)}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mist">
                <Icon name="chevron-down" className="h-4 w-4" />
              </span>
            </span>
            <span className="relative">
              <select
                value={filters.range}
                onChange={(event) => writeFilters({ ...filters, range: event.target.value, page: 1 })}
                className={cn(ui.input, "w-full appearance-none pr-9 sm:w-40")}
              >
                <option value="all">Mọi thời gian</option>
                <option value="30">30 ngày qua</option>
                <option value="90">90 ngày qua</option>
                <option value="year">Năm nay</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mist">
                <Icon name="chevron-down" className="h-4 w-4" />
              </span>
            </span>
          </div>
          <div className="flex rounded-xl border border-line bg-white p-1">
            {viewButton("grid", "Dạng lưới", "layout-grid")}
            {viewButton("list", "Dạng danh sách", "list")}
          </div>
        </div>
        <div>
          {slice.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
              <p className="text-lg font-semibold">Không có album phù hợp</p>
              <p className="mt-2 text-sm text-mist">Hãy thử tên, trạng thái hoặc thời gian khác.</p>
              <button type="button" onClick={() => router.push("/admin/albums")} className={cn(ui.secondary, "mt-5")}>
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <>
              {view === "list" ? <AlbumList albums={slice} onMore={onMore} /> : <AlbumGrid albums={slice} onMore={onMore} />}
              <div className="mt-4 flex flex-col gap-3 text-sm text-mist sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Hiển thị {from}–{to} trên {all.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => writeFilters({ ...filters, page: pageNumber - 1 })}
                    className={cn(ui.secondary, "h-9")}
                    disabled={pageNumber === 1}
                  >
                    Trước
                  </button>
                  <span className="px-2 font-medium text-ink">
                    {pageNumber} / {pages}
                  </span>
                  <button
                    type="button"
                    onClick={() => writeFilters({ ...filters, page: pageNumber + 1 })}
                    className={cn(ui.secondary, "h-9")}
                    disabled={pageNumber === pages}
                  >
                    Sau
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
