import type { ComponentType, ReactNode } from "react";
import type { GalleryModel } from "../gallery/model";

export interface TemplateProps {
  model: GalleryModel;
  banner?: ReactNode;
}

export interface TemplateRenderer {
  Gallery: ComponentType<TemplateProps>;
  Thumbnail: ComponentType<{ model: GalleryModel }>;
}
