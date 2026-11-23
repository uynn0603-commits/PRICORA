import { templateChip } from "../components/album-card.js";
import { confirmDialog } from "../components/dialog.js";
import { pageHeader } from "../components/fields.js";
import { icon } from "../components/icons.js";
import { statusBadge, statusLabel } from "../components/badge.js";
import { toast } from "../components/toast.js";
import { albumUrl, effectiveStatus, extendExpiration, galleryPath, getAlbum, updateAlbum } from "../data/store.js";
import { copyText } from "../utils/clipboard.js";
import { daysUntil, esc, expiryPhrase, formatDate } from "../utils/format.js";
import { navigate } from "../utils/router.js";
import { ui } from "../utils/ui.js";

function linkStatus(album) {
  const status = effectiveStatus(album);
  if (status === "published" && album.password) return "Có mật khẩu";
  if (status === "published") return "Đang hoạt động";
  return statusLabel(status);
}

export const sharePage = {
  title(route) {
    return `${getAlbum(route.params[0])?.name || "Chia sẻ"} · PICORA`;
  },
  render(route) {
    const album = getAlbum(route.params[0]);
    if (!album) {
      return `<div class="${ui.card} p-8"><h1 class="text-xl font-semibold">Không tìm thấy album</h1><a data-link href="/admin/albums" class="${ui.secondary} mt-4">Quay lại danh sách album</a></div>`;
    }
    const status = effectiveStatus(album);
    const url = albumUrl(album);
    const days = album.expiresAt ? daysUntil(album.expiresAt) : null;
    const published = route.query.published === "1";
    return `
      ${pageHeader({
        title: "Chia sẻ album",
        description: album.name,
        actions: `<a data-link href="${galleryPath(album)}" class="${ui.secondary}">${icon("eye", "h-4 w-4")} Mở album</a>`,
      })}
      ${
        published
          ? `<div class="mb-4 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
              <p class="font-semibold">Đã xuất bản album</p>
              <p class="mt-1 text-sm text-mist">Liên kết cho khách đã sẵn sàng. Hãy sao chép và gửi kèm mật khẩu nếu bạn có đặt.</p>
            </div>`
          : ""
      }
      <div class="grid gap-4 lg:grid-cols-5">
        <section class="${ui.card} p-5 lg:col-span-3">
          <div class="flex flex-wrap items-center gap-2">
            ${statusBadge(status)}
            ${status === "published" ? `<span class="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 text-[11px] font-semibold text-ink">${album.password ? `${icon("lock", "h-3 w-3")} Có mật khẩu` : "Liên kết mở"}</span>` : ""}
          </div>
          <p class="mt-5 text-[13px] font-semibold">Liên kết công khai</p>
          <div class="mt-2 flex flex-col gap-2 sm:flex-row">
            <input id="public-url" readonly value="${esc(url)}" class="${ui.input} bg-canvas" />
            <button type="button" id="copy-link" class="${ui.primary} shrink-0">${icon("copy", "h-4 w-4")} Sao chép liên kết</button>
          </div>
          <form id="share-form" class="mt-5 space-y-4">
            <label class="block">
              <span class="${ui.label}">Mật khẩu truy cập</span>
              <span class="relative block">
                <input id="share-password" type="password" value="${esc(album.password)}" placeholder="Không có mật khẩu" class="${ui.input} pr-11" />
                <button type="button" id="toggle-share-password" class="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-mist" aria-label="Hiện mật khẩu">${icon("eye", "h-4 w-4")}</button>
              </span>
              <span class="mt-1.5 block text-xs text-mist">Xóa trống ô này để ai có liên kết cũng xem được.</span>
            </label>
            <label class="block">
              <span class="${ui.label}">Ngày hết hạn</span>
              <input id="share-expiry" type="date" value="${esc(album.expiresAt)}" class="${ui.input}" />
              <span class="mt-1.5 block text-xs text-mist">${album.expiresAt ? `${formatDate(album.expiresAt)} · ${expiryPhrase(days)}` : "Không có ngày kết thúc"}</span>
            </label>
            <div class="flex flex-wrap gap-2 pt-2">
              <button type="submit" class="${ui.primary}">Cập nhật cài đặt</button>
              <button type="button" id="extend" class="${ui.secondary}">${icon("calendar", "h-4 w-4")} Gia hạn 30 ngày</button>
              <button type="button" id="disable-link" class="${ui.secondary} ${status === "hidden" ? "" : "text-rose-600 hover:bg-rose-50"} sm:ml-auto">${status === "hidden" ? "Bật liên kết" : "Tắt liên kết"}</button>
            </div>
          </form>
        </section>
        <aside class="${ui.card} p-5 lg:col-span-2">
          <h2 class="font-semibold">${esc(album.name)}</h2>
          <dl class="mt-4 space-y-3 text-sm">
            <div class="flex justify-between gap-4"><dt class="text-mist">Khách hàng</dt><dd class="text-right font-medium">${esc(album.customerName)}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-mist">Số ảnh</dt><dd class="font-medium">${album.photos.length}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-mist">Ngày chụp</dt><dd class="font-medium">${formatDate(album.shootingDate)}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-mist">Trạng thái liên kết</dt><dd class="font-medium">${linkStatus(album)}</dd></div>
            <div class="flex items-center justify-between gap-4"><dt class="text-mist">Giao diện</dt><dd class="flex min-w-0 items-center gap-2">${templateChip(album)}<a data-link href="/admin/albums/${album.id}/template" class="text-xs font-semibold text-primary hover:underline">Đổi</a></dd></div>
            <div class="flex justify-between gap-4"><dt class="text-mist">Tải ảnh</dt><dd class="font-medium">${album.allowDownload === false ? "Tắt" : "Cho phép"}</dd></div>
          </dl>
          <a data-link href="/admin/albums/${album.id}/photos" class="${ui.secondary} mt-6 w-full">Quản lý ảnh</a>
        </aside>
      </div>`;
  },
  mount(route) {
    const album = getAlbum(route.params[0]);
    if (!album) return;
    const password = document.getElementById("share-password");
    document.getElementById("toggle-share-password").addEventListener("click", () => {
      const show = password.type === "password";
      password.type = show ? "text" : "password";
    });
    document.getElementById("copy-link").addEventListener("click", async () => {
      const ok = await copyText(albumUrl(getAlbum(album.id)));
      if (ok) {
        toast("Đã sao chép liên kết");
        return;
      }
      const field = document.getElementById("public-url");
      field.focus();
      field.select();
      toast("Đã chọn liên kết. Nhấn Ctrl+C để sao chép.", "info");
    });
    document.getElementById("share-form").addEventListener("submit", (event) => {
      event.preventDefault();
      updateAlbum(album.id, {
        password: password.value.trim(),
        expiresAt: document.getElementById("share-expiry").value,
      });
      toast("Đã cập nhật cài đặt chia sẻ");
      navigate(`/admin/albums/${album.id}/share`, { replace: true });
    });
    document.getElementById("extend").addEventListener("click", () => {
      const next = extendExpiration(album.id, 30);
      toast(`Đã gia hạn đến ${formatDate(next.expiresAt)}`);
      navigate(`/admin/albums/${album.id}/share`, { replace: true });
    });
    document.getElementById("disable-link").addEventListener("click", async () => {
      const current = getAlbum(album.id);
      const hidden = effectiveStatus(current) === "hidden" || current.status === "hidden";
      if (!hidden) {
        const ok = await confirmDialog({
          title: "Tắt liên kết này?",
          message: "Khách hàng sẽ thấy trang thông báo album không khả dụng cho đến khi bạn bật lại.",
          confirmText: "Tắt liên kết",
          danger: true,
        });
        if (!ok) return;
        updateAlbum(album.id, { status: "hidden" });
        toast("Đã tắt liên kết của khách");
      } else {
        updateAlbum(album.id, { status: "published" });
        const next = effectiveStatus(getAlbum(album.id));
        toast(next === "expired" ? "Đã bật liên kết, nhưng ngày hết hạn vẫn đã qua." : "Đã bật liên kết của khách");
      }
      navigate(`/admin/albums/${album.id}/share`, { replace: true });
    });
  },
};
