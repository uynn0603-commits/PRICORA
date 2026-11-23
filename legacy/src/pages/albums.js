import { albumGrid, albumList } from "../components/album-card.js";
import { statusLabel } from "../components/badge.js";
import { confirmDialog } from "../components/dialog.js";
import { pageHeader } from "../components/fields.js";
import { icon } from "../components/icons.js";
import { openMenu } from "../components/menu.js";
import { toast } from "../components/toast.js";
import { deleteAlbum, effectiveStatus, galleryPath, getAlbum, getAlbums, updateAlbum } from "../data/store.js";
import { navigate } from "../utils/router.js";
import { parseISODate } from "../utils/format.js";
import { ui } from "../utils/ui.js";

const PAGE_SIZE = 6;
const VIEW_KEY = "view.albumView";

function readFilters() {
  const params = new URLSearchParams(location.search);
  return {
    q: params.get("q") || "",
    status: params.get("status") || "all",
    range: params.get("range") || "all",
    page: Math.max(1, Number(params.get("page") || 1)),
    view: localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid",
  };
}

function inRange(album, range) {
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

function filteredAlbums(filters) {
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

function writeFilters(filters, { resetPage = false } = {}) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.range !== "all") params.set("range", filters.range);
  const page = resetPage ? 1 : filters.page;
  if (page > 1) params.set("page", String(page));
  const next = params.toString();
  history.replaceState({}, "", next ? `/admin/albums?${next}` : "/admin/albums");
}

export const albumsPage = {
  title() {
    return "Album · PICORA";
  },
  render() {
    const filters = readFilters();
    return `
      ${pageHeader({
        title: "Album của tôi",
        description: "Tạo một album cho mỗi khách hàng, sau đó chia sẻ bằng liên kết riêng.",
        actions: `<a data-link href="/admin/albums/new" class="${ui.primary}">${icon("plus", "h-4 w-4")} Tạo album</a>`,
      })}
      <div id="album-page">
        <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <label class="relative min-w-0 flex-1">
            <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist">${icon("search", "h-4 w-4")}</span>
            <input id="album-search" value="${filters.q.replace(/"/g, "&quot;")}" placeholder="Tìm theo tên album hoặc khách hàng" class="${ui.input} pl-9" />
          </label>
          <div class="grid grid-cols-2 gap-3 sm:flex">
            <span class="relative">
              <select id="status-filter" class="${ui.input} w-full appearance-none pr-9 sm:w-40">
                ${["all", "published", "draft", "hidden", "expired"]
                  .map((status) => `<option value="${status}" ${filters.status === status ? "selected" : ""}>${status === "all" ? "Tất cả trạng thái" : statusLabel(status)}</option>`)
                  .join("")}
              </select>
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mist">${icon("chevron-down", "h-4 w-4")}</span>
            </span>
            <span class="relative">
              <select id="date-filter" class="${ui.input} w-full appearance-none pr-9 sm:w-40">
                <option value="all" ${filters.range === "all" ? "selected" : ""}>Mọi thời gian</option>
                <option value="30" ${filters.range === "30" ? "selected" : ""}>30 ngày qua</option>
                <option value="90" ${filters.range === "90" ? "selected" : ""}>90 ngày qua</option>
                <option value="year" ${filters.range === "year" ? "selected" : ""}>Năm nay</option>
              </select>
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mist">${icon("chevron-down", "h-4 w-4")}</span>
            </span>
          </div>
          <div class="flex rounded-xl border border-line bg-white p-1">
            <button type="button" data-view="grid" class="grid h-9 w-10 place-items-center rounded-lg ${filters.view === "grid" ? "bg-canvas text-ink" : "text-mist"}" aria-label="Dạng lưới">${icon("layout-grid", "h-4 w-4")}</button>
            <button type="button" data-view="list" class="grid h-9 w-10 place-items-center rounded-lg ${filters.view === "list" ? "bg-canvas text-ink" : "text-mist"}" aria-label="Dạng danh sách">${icon("list", "h-4 w-4")}</button>
          </div>
        </div>
        <div id="album-results"></div>
      </div>`;
  },
  mount() {
    const page = document.getElementById("album-page");
    const paint = () => {
      const filters = currentFilters();
      const all = filteredAlbums(filters);
      const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
      const pageNumber = Math.min(filters.page, pages);
      if (pageNumber !== filters.page) {
        filters.page = pageNumber;
        writeFilters(filters);
      }
      const slice = all.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE);
      const from = all.length ? (pageNumber - 1) * PAGE_SIZE + 1 : 0;
      const to = Math.min(pageNumber * PAGE_SIZE, all.length);
      const list =
        slice.length === 0
          ? `<div class="rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
              <p class="text-lg font-semibold">Không có album phù hợp</p>
              <p class="mt-2 text-sm text-mist">Hãy thử tên, trạng thái hoặc thời gian khác.</p>
              <button type="button" id="clear-filters" class="${ui.secondary} mt-5">Xóa bộ lọc</button>
            </div>`
          : `${filters.view === "list" ? albumList(slice) : albumGrid(slice)}
            <div class="mt-4 flex flex-col gap-3 text-sm text-mist sm:flex-row sm:items-center sm:justify-between">
              <p>Hiển thị ${from}–${to} trên ${all.length}</p>
              <div class="flex items-center gap-2">
                <button type="button" data-page="${pageNumber - 1}" class="${ui.secondary} h-9" ${pageNumber === 1 ? "disabled" : ""}>Trước</button>
                <span class="px-2 font-medium text-ink">${pageNumber} / ${pages}</span>
                <button type="button" data-page="${pageNumber + 1}" class="${ui.secondary} h-9" ${pageNumber === pages ? "disabled" : ""}>Sau</button>
              </div>
            </div>`;
      document.getElementById("album-results").innerHTML = list;
      document.querySelectorAll("[data-view]").forEach((button) => {
        const on = button.dataset.view === filters.view;
        button.className = `grid h-9 w-10 place-items-center rounded-lg ${on ? "bg-canvas text-ink" : "text-mist"}`;
      });
    };

    const currentFilters = () => ({
      q: document.getElementById("album-search").value,
      status: document.getElementById("status-filter").value,
      range: document.getElementById("date-filter").value,
      page: readFilters().page,
      view: localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid",
    });

    const sync = (resetPage = true) => {
      const filters = currentFilters();
      if (resetPage) filters.page = 1;
      writeFilters(filters, { resetPage });
      paint();
    };

    page.addEventListener("input", (event) => {
      if (event.target.id === "album-search") sync(true);
    });
    page.addEventListener("change", (event) => {
      if (event.target.id === "status-filter" || event.target.id === "date-filter") sync(true);
    });
    page.addEventListener("click", async (event) => {
      const view = event.target.closest("[data-view]");
      if (view) {
        localStorage.setItem(VIEW_KEY, view.dataset.view);
        paint();
        return;
      }
      if (event.target.closest("#clear-filters")) {
        navigate("/admin/albums");
        return;
      }
      const pager = event.target.closest("[data-page]");
      if (pager && !pager.disabled) {
        const filters = currentFilters();
        filters.page = Number(pager.dataset.page);
        writeFilters(filters);
        paint();
        return;
      }
      const more = event.target.closest("[data-more]");
      if (!more) return;
      event.preventDefault();
      event.stopPropagation();
      const album = getAlbum(more.dataset.more);
      if (!album) return;
      const status = effectiveStatus(album);
      openMenu(more, [
        { label: "Xem album", icon: "eye", onClick: () => navigate(galleryPath(album)) },
        { label: "Chỉnh sửa", icon: "pencil", onClick: () => navigate(`/admin/albums/${album.id}/edit`) },
        { label: "Quản lý ảnh", icon: "images", onClick: () => navigate(`/admin/albums/${album.id}/photos`) },
        { label: "Đổi giao diện", icon: "layout-template", onClick: () => navigate(`/admin/albums/${album.id}/template`) },
        { label: "Chia sẻ", icon: "share-2", onClick: () => navigate(`/admin/albums/${album.id}/share`) },
        status === "hidden" || status === "draft"
          ? {
              label: "Xuất bản",
              icon: "circle-check",
              onClick: () => {
                updateAlbum(album.id, { status: "published" });
                const next = effectiveStatus(getAlbum(album.id));
                toast(next === "expired" ? "Đã xuất bản, nhưng ngày hết hạn đã qua." : "Đã xuất bản album");
                paint();
              },
            }
          : {
              label: "Ẩn",
              icon: "eye-off",
              onClick: () => {
                updateAlbum(album.id, { status: "hidden" });
                toast("Đã ẩn album với khách hàng");
                paint();
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
            paint();
          },
        },
      ]);
    });
    paint();
  },
};
