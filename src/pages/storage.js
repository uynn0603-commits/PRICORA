import { pageHeader } from "../components/fields.js";
import { effectiveStatus, storageStats } from "../data/store.js";
import { esc, formatBytes, formatDate, plural } from "../utils/format.js";
import { statusBadge } from "../components/badge.js";
import { ui } from "../utils/ui.js";

export const storagePage = {
  title() {
    return "Lưu trữ · PICORA";
  },
  render() {
    const stats = storageStats();
    const percent = Math.min(100, Math.round(stats.ratio * 100));
    const bar = stats.ratio >= 0.95 ? "bg-rose-500" : stats.ratio >= 0.8 ? "bg-amber-500" : "bg-primary";
    return `
      ${pageHeader({
        title: "Lưu trữ",
        description: "Xem mỗi album đang dùng bao nhiêu dung lượng trong gói của studio.",
      })}
      ${
        stats.ratio >= 0.8
          ? `<div class="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
              <p class="font-semibold">Dung lượng sắp đầy</p>
              <p class="mt-1">Bạn đang dùng ${percent}% trên tổng ${formatBytes(stats.quota)}. Hãy xóa những ảnh không còn cần giao, hoặc giữ ảnh tải lên ở dung lượng nhỏ.</p>
            </div>`
          : ""
      }
      <section class="grid gap-4 md:grid-cols-3">
        ${[
          ["Tổng dung lượng", formatBytes(stats.quota)],
          ["Đã sử dụng", formatBytes(stats.used)],
          ["Còn trống", formatBytes(stats.available)],
        ]
          .map(
            ([label, value]) => `
              <article class="${ui.card} p-5">
                <p class="text-[13px] font-medium text-mist">${label}</p>
                <p class="mt-3 text-[28px] font-semibold tracking-tight">${value}</p>
              </article>`,
          )
          .join("")}
      </section>
      <section class="${ui.card} mt-4 p-5">
        <div class="flex items-center justify-between text-sm">
          <p class="font-semibold">Mức sử dụng</p>
          <p class="text-mist">${percent}%</p>
        </div>
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-line">
          <div class="h-full rounded-full ${bar}" style="width:${percent}%"></div>
        </div>
      </section>
      <section class="${ui.card} mt-4 overflow-hidden">
        <div class="hidden grid-cols-[1.4fr_.6fr_.7fr_.7fr] gap-3 border-b border-line px-5 py-3 text-xs font-semibold text-mist md:grid">
          <span>Album</span><span>Số ảnh</span><span>Dung lượng</span><span>Cập nhật</span>
        </div>
        <div class="divide-y divide-line">
          ${stats.rows
            .map(
              (row) => `
                <a data-link href="/admin/albums/${row.album.id}/photos" class="grid gap-2 px-5 py-4 hover:bg-canvas md:grid-cols-[1.4fr_.6fr_.7fr_.7fr] md:items-center">
                  <span class="min-w-0">
                    <span class="flex items-center gap-2">
                      <span class="truncate font-semibold">${esc(row.album.name)}</span>
                      <span class="hidden sm:inline">${statusBadge(effectiveStatus(row.album))}</span>
                    </span>
                    <span class="mt-1 block truncate text-sm text-mist md:hidden">${plural(row.photos, "photo")} · ${formatBytes(row.bytes)}</span>
                  </span>
                  <span class="hidden text-sm md:block">${row.photos}</span>
                  <span class="hidden text-sm font-medium md:block">${formatBytes(row.bytes)}</span>
                  <span class="hidden text-sm text-mist md:block">${formatDate(row.album.updatedAt)}</span>
                </a>`,
            )
            .join("")}
        </div>
      </section>`;
  },
  mount() {},
};
