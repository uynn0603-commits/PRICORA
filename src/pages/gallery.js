import { statusLabel } from "../components/badge.js";
import { galleryFooter } from "../components/gallery/GalleryFooter.js";
import { toGalleryModel } from "../components/gallery/model.js";
import { icon } from "../components/icons.js";
import { logoLockup } from "../components/logo.js";
import { isTemplateId } from "../components/templates/catalog.js";
import { getRenderer } from "../components/templates/index.js";
import { coverSrc } from "../data/media.js";
import { galleryAccess, getAlbumBySlug, unlock } from "../data/store.js";
import { esc } from "../utils/format.js";
import { rerender } from "../utils/router.js";
import { ui } from "../utils/ui.js";

const COPY = {
  expired: {
    eyebrow: "Album không khả dụng",
    title: "Album này đã hết hạn",
    body: "Liên kết từ nhiếp ảnh gia không còn hoạt động. Hãy liên hệ studio nếu bạn vẫn cần những bức ảnh này.",
  },
  hidden: {
    eyebrow: "Album không khả dụng",
    title: "Album này hiện không khả dụng",
    body: "Studio đã tạm tắt liên kết này. Hãy liên hệ lại với studio nếu bạn đang chờ nhận ảnh.",
  },
  unpublished: {
    eyebrow: "Album không khả dụng",
    title: "Album này chưa sẵn sàng",
    body: "Nhiếp ảnh gia vẫn đang chuẩn bị album. Liên kết sẽ mở khi album được xuất bản.",
  },
  invalid: {
    eyebrow: "Album không khả dụng",
    title: "Không tìm thấy album này",
    body: "Liên kết không khớp với album nào. Hãy kiểm tra lại địa chỉ bạn nhận được từ studio.",
  },
};

export const galleryPage = {
  title(route) {
    const album = getAlbumBySlug(route.params[0]);
    return `${album?.name || "Album"} · PICORA`;
  },
  render(route) {
    const album = getAlbumBySlug(route.params[0]);
    const access = galleryAccess(album);
    if (access.state === "password") return renderGate(album);
    if (access.state !== "ok") return renderUnavailable(access.state);
    const model = modelFor(album, route, access);
    return getRenderer(model.templateId).render(model, { banner: studioBanner(album, access, route) });
  },
  mount(route) {
    const album = getAlbumBySlug(route.params[0]);
    const access = galleryAccess(album);
    if (access.state === "password") mountGate(album);
    if (access.state !== "ok") return;
    const model = modelFor(album, route, access);
    getRenderer(model.templateId).mount(model);
  },
};

// Studio users may preview another template via ?template= before applying it;
// clients always see the template saved on the album.
function modelFor(album, route, access) {
  const override = access.admin && isTemplateId(route.query.template) ? route.query.template : undefined;
  return toGalleryModel(album, { templateId: override });
}

function studioBanner(album, access, route) {
  if (!access.admin || route.query.embed === "1" || access.status === "published") return "";
  return `<div class="bg-[#191827] px-4 py-2 text-center font-jakarta text-xs text-white">Chế độ xem trước của studio. Khách hàng hiện thấy album ở trạng thái “${esc(statusLabel(access.status))}”. <a data-link href="/admin/albums/${album.id}/share" class="underline">Chỉnh quyền truy cập</a></div>`;
}

function renderGate(album) {
  const cover = coverSrc(album, 1600);
  return `
    <div class="relative min-h-screen overflow-hidden bg-ink">
      ${cover ? `<img src="${esc(cover)}" alt="" class="absolute inset-0 h-full w-full scale-105 object-cover opacity-40 blur-2xl" />` : ""}
      <div class="absolute inset-0 bg-ink/55"></div>
      <div class="relative mx-auto flex min-h-screen max-w-md items-center px-4 py-12">
        <div class="w-full rounded-3xl bg-white p-7 sm:p-8">
          ${logoLockup({ size: 32 })}
          <h1 class="mt-8 text-2xl font-semibold tracking-tight">Album này được bảo vệ</h1>
          <p class="mt-2 text-sm text-mist">${esc(album.name)}</p>
          <form id="gate-form" class="mt-6 space-y-3">
            <label class="block">
              <span class="${ui.label}">Mật khẩu</span>
              <input id="gate-password" type="password" autocomplete="current-password" class="${ui.input}" placeholder="Nhập mật khẩu album" />
            </label>
            <p id="gate-error" class="hidden text-sm font-medium text-rose-600"></p>
            <button type="submit" class="${ui.primary} h-11 w-full">Xem album</button>
          </form>
          <p class="mt-4 text-center text-xs text-mist">Mật khẩu demo · <span class="font-semibold text-ink">${esc(album.password)}</span></p>
        </div>
      </div>
    </div>`;
}

function mountGate(album) {
  const form = document.getElementById("gate-form");
  const input = document.getElementById("gate-password");
  const error = document.getElementById("gate-error");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (input.value.trim() === album.password) {
      unlock(album.slug);
      rerender();
      return;
    }
    error.textContent = "Mật khẩu không đúng. Vui lòng thử lại.";
    error.classList.remove("hidden");
    input.focus();
  });
  input.focus();
}

function renderUnavailable(state) {
  const copy = COPY[state] || COPY.invalid;
  return `
    <div class="flex min-h-screen flex-col bg-canvas">
      <header class="px-6 py-5">${logoLockup({ size: 32 })}</header>
      <main class="flex flex-1 items-center justify-center px-6 pb-16">
        <div class="max-w-md text-center">
          <span class="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-line bg-white text-primary">${icon(state === "expired" ? "calendar" : state === "invalid" ? "link" : "eye-off", "h-6 w-6")}</span>
          <p class="text-sm font-semibold text-primary">${copy.eyebrow}</p>
          <h1 class="mt-3 text-4xl font-semibold tracking-tight">${copy.title}</h1>
          <p class="mt-4 text-sm leading-relaxed text-mist">${copy.body}</p>
        </div>
      </main>
      ${galleryFooter({ tone: "light" })}
    </div>`;
}
