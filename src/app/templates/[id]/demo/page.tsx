"use client";

import { useMemo } from "react";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { toGalleryModel } from "@/components/gallery/model";
import { getTemplateComponent, getTemplateMeta } from "@/components/templates";
import { getDemoAlbum } from "@/lib/template-demos";
import { useTitle } from "@/lib/use-store";

export default function TemplateDemoPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  useTitle(`Giao diện ${getTemplateMeta(id).name} · PICORA`);
  const model = useMemo(() => {
    const album = getDemoAlbum(id);
    return album ? toGalleryModel(album) : null;
  }, [id]);

  if (!model) notFound();

  const Template = getTemplateComponent(model.templateId);
  const banner =
    search.get("embed") === "1" ? null : (
      <div className="bg-[#191827] px-4 py-2 text-center font-jakarta text-xs text-white">
        Bản demo giao diện · {getTemplateMeta(model.templateId).name} · ảnh và thông tin mẫu
      </div>
    );
  return <Template model={model} banner={banner} />;
}
