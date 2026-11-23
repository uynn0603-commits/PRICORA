"use client";

import Link from "next/link";
import { BarChart } from "@/components/charts/BarChart";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { expiryPhrase, formatBytes, formatDate, occasionLabel, plural } from "@/lib/format";
import { coverSrc } from "@/lib/media";
import { effectiveStatus, getAlbums, getExpiring, getMonthlyStats, getOverview, getSession } from "@/lib/store";
import { ui } from "@/lib/ui";
import { useStore, useTitle } from "@/lib/use-store";

function greeting(name: string) {
  const hour = new Date().getHours();
  const part = hour < 11 ? "Chào buổi sáng" : hour < 14 ? "Chào buổi trưa" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  const first = name.trim().split(/\s+/).slice(-1)[0] || name;
  return `${part}, ${first}`;
}

export default function DashboardPage() {
  useStore();
  useTitle("Tổng quan · PICORA");
  const userName = getSession()?.name || "";
  const overview = getOverview();
  const months = getMonthlyStats(8);
  const recent = getAlbums().slice(0, 4);
  const expiring = getExpiring();
  const today = new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" });
  const cards = [
    {
      label: "Tổng số album",
      value: overview.albums,
      note: `${overview.current.albums} album tạo trong tháng này`,
      icon: "images",
      href: "/admin/albums",
    },
    {
      label: "Tổng số ảnh",
      value: overview.photos.toLocaleString("vi-VN"),
      note: `${overview.current.photos.toLocaleString("vi-VN")} ảnh thêm trong tháng này`,
      icon: "image",
      href: "/admin/albums",
    },
    {
      label: "Dung lượng đã dùng",
      value: formatBytes(overview.storage.used),
      note: `Còn trống ${formatBytes(overview.storage.available)}`,
      icon: "hard-drive",
      href: "/admin/storage",
    },
    {
      label: "Album đã xuất bản",
      value: overview.published,
      note: "Khách hàng đang xem được",
      icon: "circle-check",
      href: "/admin/albums?status=published",
    },
  ];

  return (
    <>
      <section className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-mist">{today}</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight md:text-[32px]">{greeting(userName)}</h1>
        </div>
        <Link href="/admin/albums/new" className={ui.primary}>
          <Icon name="plus" className="h-4 w-4" /> Tạo album
        </Link>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className={`${ui.card} block p-5 transition hover:border-primary/30`}>
            <span className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-medium text-mist">{card.label}</span>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon name={card.icon} className="h-4 w-4" />
              </span>
            </span>
            <span className="mt-4 block text-[30px] font-semibold tracking-tight">{card.value}</span>
            <span className="mt-1 block text-xs text-mist">{card.note}</span>
          </Link>
        ))}
      </section>
      <section className="mt-4 grid gap-4 xl:grid-cols-5">
        <article className={`${ui.card} p-5 xl:col-span-3`}>
          <h2 className="text-base font-semibold">Album đã tạo</h2>
          <p className="mt-1 text-sm text-mist">Số album khách hàng mới trong 8 tháng gần nhất.</p>
          <div className="mt-6">
            <BarChart series={months.map((item) => ({ label: item.label, value: item.albums, display: String(item.albums) }))} />
          </div>
        </article>
        <article className={`${ui.card} p-5 xl:col-span-2`}>
          <h2 className="text-base font-semibold">Dung lượng</h2>
          <p className="mt-1 text-sm text-mist">Dung lượng ảnh thêm vào mỗi tháng.</p>
          <div className="mt-6">
            <BarChart series={months.map((item) => ({ label: item.label, value: item.bytes, display: formatBytes(item.bytes) }))} />
          </div>
        </article>
      </section>
      <section className="mt-4 grid gap-4 xl:grid-cols-5">
        <article className={`${ui.card} p-5 xl:col-span-3`}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Album gần đây</h2>
            <Link href="/admin/albums" className="text-sm font-semibold text-primary">
              Xem tất cả
            </Link>
          </div>
          <div className="mt-2 divide-y divide-line">
            {recent.map((album) => {
              const src = coverSrc(album, 200);
              return (
                <Link key={album.id} href={`/admin/albums/${album.id}/photos`} className="flex items-center gap-4 py-3">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" className="h-14 w-14 rounded-xl object-cover" />
                  ) : (
                    <span className="grid h-14 w-14 place-items-center rounded-xl bg-canvas text-mist">
                      <Icon name="image" className="h-4 w-4" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{album.name}</span>
                    <span className="mt-0.5 block truncate text-sm text-mist">
                      {album.customerName === album.name ? occasionLabel(album.occasion) || "Album" : album.customerName} · {plural(album.photos.length, "photo")}
                    </span>
                  </span>
                  <span className="hidden sm:block">
                    <StatusBadge status={effectiveStatus(album)} />
                  </span>
                  <span className="hidden text-sm text-mist md:block">{formatDate(album.createdAt)}</span>
                </Link>
              );
            })}
          </div>
        </article>
        <article className={`${ui.card} p-5 xl:col-span-2`}>
          <h2 className="text-base font-semibold">Sắp hết hạn</h2>
          <p className="mt-1 text-sm text-mist">Album đã xuất bản sẽ hết hạn trong 14 ngày tới.</p>
          <div className="mt-3">
            {expiring.length ? (
              <ul className="divide-y divide-line">
                {expiring.map((item) => (
                  <li key={item.album.id}>
                    <Link href={`/admin/albums/${item.album.id}/share`} className="flex items-center justify-between gap-3 py-3">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{item.album.name}</span>
                        <span className="mt-0.5 block text-sm text-mist">{formatDate(item.album.expiresAt)}</span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-[#9A6B12]">{expiryPhrase(item.days)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-sm text-mist">Không có album nào hết hạn trong 14 ngày tới.</p>
            )}
          </div>
        </article>
      </section>
    </>
  );
}
