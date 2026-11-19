import { pageHeader } from "../components/fields.js";
import { icon } from "../components/icons.js";
import { openTemplatePreview } from "../components/template-selector/TemplatePreview.js";
import { bindTemplateSelector, templateSelector } from "../components/template-selector/TemplateSelector.js";
import { getTemplateMeta } from "../components/templates/index.js";
import { toast } from "../components/toast.js";
import { photoSrc } from "../data/media.js";
import { getAlbum, setAlbumTemplate } from "../data/store.js";
import { esc } from "../utils/format.js";
import { navigate } from "../utils/router.js";
import { ui } from "../utils/ui.js";

let choice = null;

// Previews use the album's own photos once it has any; until then the sample album
// for each template stands in.
export function previewSrc(album, templateId) {
  const hasPhotos = album?.photos.some((photo) => photoSrc(photo));
  return hasPhotos ? `/gallery/${album.slug}?template=${templateId}&embed=1` : `/templates/${templateId}/demo?embed=1`;
}

function footerBar(album) {
  const changed = choice !== album.templateId;
  return `
    <p class="text-sm text-mist">${changed ? `Chuyển sang <span class="font-semibold text-ink">${esc(getTemplateMeta(choice).name)}</span>. Ảnh, thông tin và liên kết của khách vẫn giữ nguyên.` : `Khách hàng đang thấy giao diện <span class="font-semibold text-ink">${esc(getTemplateMeta(album.templateId).name)}</span>.`}</p>
    <div class="flex gap-2 sm:ml-auto">
      <button type="button" data-preview-choice class="${ui.secondary}">${icon("eye", "h-4 w-4")} Xem trước</button>
      <button type="button" data-apply class="${ui.primary}" ${changed ? "" : "disabled"}>Áp dụng giao diện</button>
    </div>`;
}

export const albumTemplatePage = {
  title(route) {
    return `Giao diện · ${getAlbum(route.params[0])?.name || "Album"} · PICORA`;
  },
  render(route) {
    const album = getAlbum(route.params[0]);
    if (!album) {
      return `<div class="${ui.card} p-8"><h1 class="text-xl font-semibold">Không tìm thấy album</h1><a data-link href="/admin/albums" class="${ui.secondary} mt-4">Quay lại danh sách album</a></div>`;
    }
    choice = album.templateId;
    return `
      ${pageHeader({
        title: "Đổi giao diện",
        description: `${album.name} · Chỉ thay đổi cách trình bày album.`,
        actions: `<a data-link href="/gallery/${album.slug}" class="${ui.secondary}">${icon("eye", "h-4 w-4")} Mở album</a>`,
      })}
      <div id="template-picker">${templateSelector({ selected: choice, current: album.templateId, selectLabel: "Dùng giao diện này" })}</div>
      <div id="template-bar" class="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-col gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center md:-mx-8 md:px-8">${footerBar(album)}</div>`;
  },
  mount(route) {
    const album = getAlbum(route.params[0]);
    if (!album) return;
    const bar = document.getElementById("template-bar");
    const picker = bindTemplateSelector(document.getElementById("template-picker"), {
      getOptions: () => ({ selected: choice, current: album.templateId, selectLabel: "Dùng giao diện này" }),
      onSelect: (id) => pick(id),
      onPreview: (id) => preview(id),
    });
    const pick = (id) => {
      choice = id;
      picker.refresh();
      bar.innerHTML = footerBar(album);
    };
    const preview = (id) =>
      openTemplatePreview({
        templateId: id,
        srcFor: (templateId) => previewSrc(album, templateId),
        selectedId: () => choice,
        selectLabel: "Dùng giao diện này",
        onSelect: pick,
      });
    bar.addEventListener("click", (event) => {
      if (event.target.closest("[data-preview-choice]")) preview(choice);
      if (event.target.closest("[data-apply]")) {
        setAlbumTemplate(album.id, choice);
        toast(`Đã áp dụng ${getTemplateMeta(choice).name}. Liên kết của khách không đổi.`);
        navigate(`/admin/albums/${album.id}/template`, { replace: true, keepScroll: true });
      }
    });
  },
};
