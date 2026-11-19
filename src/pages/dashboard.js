import { getAlbums, getExpiring, getMonthlyStats, getOverview, getSettings } from "../data/store.js";
import { coverSrc } from "../data/media.js";
import { statusBadge } from "../components/badge.js";
import { barChart } from "../components/chart.js";
import { icon } from "../components/icons.js";
import { effectiveStatus } from "../data/store.js";
import { esc, expiryPhrase, formatBytes, formatDate, occasionLabel, plural } from "../utils/format.js";
import { ui } from "../utils/ui.js";

function greeting(name) {
  const hour = new Date().getHours();
  const part = hour < 11 ? "Chào buổi sáng" : hour < 14 ? "Chào buổi trưa" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  const first = name.trim().split(/\s+/).slice(-1)[0] || name;
  return `${part}, ${first}`;
}

export const dashboardPage = {
  title() {
    return "Tổng quan · PICORA";
  },
  render() {
    const settings = getSettings();
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
    return `
      <section class="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-sm text-mist">${esc(today)}</p>
          <h1 class="mt-1 text-[28px] font-semibold tracking-tight md:text-[32px]">${esc(greeting(settings.accountName))}</h1>
        </div>
        <a data-link href="/admin/albums/new" class="${ui.primary}">${icon("plus", "h-4 w-4")} Tạo album</a>
      </section>
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        ${cards
          .map(
            (card) => `
              <a data-link href="${card.href}" class="${ui.card} block p-5 transition hover:border-primary/30">
                <span class="flex items-center justify-between gap-3">
                  <span class="text-[13px] font-medium text-mist">${card.label}</span>
                  <span class="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">${icon(card.icon, "h-4 w-4")}</span>
                </span>
                <span class="mt-4 block text-[30px] font-semibold tracking-tight">${card.value}</span>
                <span class="mt-1 block text-xs text-mist">${card.note}</span>
              </a>`,
          )
          .join("")}
      </section>
      <section class="mt-4 grid gap-4 xl:grid-cols-5">
        <article class="${ui.card} p-5 xl:col-span-3">
          <h2 class="text-base font-semibold">Album đã tạo</h2>
          <p class="mt-1 text-sm text-mist">Số album khách hàng mới trong 8 tháng gần nhất.</p>
          <div class="mt-6">
            ${barChart(months.map((item) => ({ label: item.label, value: item.albums, display: String(item.albums) })))}
          </div>
        </article>
        <article class="${ui.card} p-5 xl:col-span-2">
          <h2 class="text-base font-semibold">Dung lượng</h2>
          <p class="mt-1 text-sm text-mist">Dung lượng ảnh thêm vào mỗi tháng.</p>
          <div class="mt-6">
            ${barChart(months.map((item) => ({ label: item.label, value: item.bytes, display: formatBytes(item.bytes) })))}
          </div>
        </article>
      </section>
      <section class="mt-4 grid gap-4 xl:grid-cols-5">
        <article class="${ui.card} p-5 xl:col-span-3">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold">Album gần đây</h2>
            <a data-link href="/admin/albums" class="text-sm font-semibold text-primary">Xem tất cả</a>
          </div>
          <div class="mt-2 divide-y divide-line">
            ${recent
              .map((album) => {
                const src = coverSrc(album, 200);
                return `
                  <a data-link href="/admin/albums/${album.id}/photos" class="flex items-center gap-4 py-3">
                    ${
                      src
                        ? `<img src="${esc(src)}" alt="" class="h-14 w-14 rounded-xl object-cover" />`
                        : `<span class="grid h-14 w-14 place-items-center rounded-xl bg-canvas text-mist">${icon("image", "h-4 w-4")}</span>`
                    }
                    <span class="min-w-0 flex-1">
                      <span class="block truncate font-semibold">${esc(album.name)}</span>
                      <span class="mt-0.5 block truncate text-sm text-mist">${esc(album.customerName === album.name ? occasionLabel(album.occasion) || "Album" : album.customerName)} · ${plural(album.photos.length, "photo")}</span>
                    </span>
                    <span class="hidden sm:block">${statusBadge(effectiveStatus(album))}</span>
                    <span class="hidden text-sm text-mist md:block">${formatDate(album.createdAt)}</span>
                  </a>`;
              })
              .join("")}
          </div>
        </article>
        <article class="${ui.card} p-5 xl:col-span-2">
          <h2 class="text-base font-semibold">Sắp hết hạn</h2>
          <p class="mt-1 text-sm text-mist">Album đã xuất bản sẽ hết hạn trong 14 ngày tới.</p>
          <div class="mt-3">
            ${
              expiring.length
                ? `<ul class="divide-y divide-line">${expiring
                    .map(
                      (item) => `
                        <li>
                          <a data-link href="/admin/albums/${item.album.id}/share" class="flex items-center justify-between gap-3 py-3">
                            <span class="min-w-0">
                              <span class="block truncate font-medium">${esc(item.album.name)}</span>
                              <span class="mt-0.5 block text-sm text-mist">${formatDate(item.album.expiresAt)}</span>
                            </span>
                            <span class="shrink-0 text-sm font-semibold text-[#9A6B12]">${expiryPhrase(item.days)}</span>
                          </a>
                        </li>`,
                    )
                    .join("")}</ul>`
                : '<p class="py-8 text-sm text-mist">Không có album nào hết hạn trong 14 ngày tới.</p>'
            }
          </div>
        </article>
      </section>`;
  },
  mount() {},
};
