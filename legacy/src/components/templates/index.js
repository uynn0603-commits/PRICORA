import * as DarkCinematic from "./DarkCinematic.js";
import * as EditorialMagazine from "./EditorialMagazine.js";
import * as MasonryGallery from "./MasonryGallery.js";
import * as WeddingLuxury from "./WeddingLuxury.js";
import { DEFAULT_TEMPLATE_ID, getTemplateMeta, TEMPLATE_CATALOG } from "./catalog.js";

// Every renderer exposes render(model, context), mount(model) and thumbnail(demoModel).
const RENDERERS = {
  "wedding-luxury": WeddingLuxury,
  "editorial-magazine": EditorialMagazine,
  "masonry-gallery": MasonryGallery,
  "dark-cinematic": DarkCinematic,
};

export function getRenderer(templateId) {
  return RENDERERS[templateId] || RENDERERS[DEFAULT_TEMPLATE_ID];
}

export function listTemplates() {
  return TEMPLATE_CATALOG.filter((meta) => RENDERERS[meta.id]);
}

export { getTemplateMeta };
