import type { ComponentType } from "react";
import { DEFAULT_TEMPLATE_ID, getTemplateMeta, TEMPLATE_CATALOG, type TemplateMeta } from "@/lib/catalog";
import type { GalleryModel } from "../gallery/model";
import { DarkCinematic, DarkCinematicThumbnail } from "./DarkCinematic";
import { EditorialMagazine, EditorialMagazineThumbnail } from "./EditorialMagazine";
import { MasonryGallery, MasonryGalleryThumbnail } from "./MasonryGallery";
import type { TemplateProps, TemplateRenderer } from "./types";
import { WeddingLuxury, WeddingLuxuryThumbnail } from "./WeddingLuxury";

// Every template provides a full gallery page and a small thumbnail of a demo model.
const RENDERERS: Record<string, TemplateRenderer> = {
  "wedding-luxury": { Gallery: WeddingLuxury, Thumbnail: WeddingLuxuryThumbnail },
  "editorial-magazine": { Gallery: EditorialMagazine, Thumbnail: EditorialMagazineThumbnail },
  "masonry-gallery": { Gallery: MasonryGallery, Thumbnail: MasonryGalleryThumbnail },
  "dark-cinematic": { Gallery: DarkCinematic, Thumbnail: DarkCinematicThumbnail },
};

export function getRenderer(templateId?: string): TemplateRenderer {
  return (templateId && RENDERERS[templateId]) || RENDERERS[DEFAULT_TEMPLATE_ID];
}

export function getTemplateComponent(templateId?: string): ComponentType<TemplateProps> {
  return getRenderer(templateId).Gallery;
}

export function getTemplateThumbnail(templateId?: string): ComponentType<{ model: GalleryModel }> {
  return getRenderer(templateId).Thumbnail;
}

export function listTemplates(): TemplateMeta[] {
  return TEMPLATE_CATALOG.filter((meta) => RENDERERS[meta.id]);
}

export { getTemplateMeta };
export type { TemplateProps, TemplateRenderer };
