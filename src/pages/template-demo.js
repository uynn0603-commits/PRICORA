import { toGalleryModel } from "../components/gallery/model.js";
import { getRenderer, getTemplateMeta } from "../components/templates/index.js";
import { getDemoAlbum } from "../data/template-demos.js";
import { esc } from "../utils/format.js";
import { notFoundPage } from "./not-found.js";

function demoModel(route) {
  const album = getDemoAlbum(route.params[0]);
  return album ? toGalleryModel(album) : null;
}

export const templateDemoPage = {
  title(route) {
    return `Giao diện ${getTemplateMeta(route.params[0]).name} · PICORA`;
  },
  render(route) {
    const model = demoModel(route);
    if (!model) return notFoundPage.render(route);
    const banner =
      route.query.embed === "1"
        ? ""
        : `<div class="bg-[#191827] px-4 py-2 text-center font-jakarta text-xs text-white">Bản demo giao diện · ${esc(getTemplateMeta(model.templateId).name)} · ảnh và thông tin mẫu</div>`;
    return getRenderer(model.templateId).render(model, { banner });
  },
  mount(route) {
    const model = demoModel(route);
    if (model) getRenderer(model.templateId).mount(model);
  },
};
