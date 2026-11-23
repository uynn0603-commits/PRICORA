"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AlbumNotFound } from "@/components/albums/AlbumNotFound";
import { previewSrc } from "@/components/albums/preview";
import { TemplatePreview } from "@/components/template-selector/TemplatePreview";
import { TemplateSelector } from "@/components/template-selector/TemplateSelector";
import { PageHeader } from "@/components/ui/fields";
import { Icon } from "@/components/ui/Icon";
import { getTemplateMeta } from "@/lib/catalog";
import { toast } from "@/lib/overlay";
import { galleryPath, getAlbum, setAlbumTemplate } from "@/lib/store";
import { ui } from "@/lib/ui";
import { useStore, useTitle } from "@/lib/use-store";

const SELECT_LABEL = "Dùng giao diện này";

export default function AlbumTemplatePage() {
  useStore();
  const { id } = useParams<{ id: string }>();
  const album = getAlbum(id);
  useTitle(`Giao diện · ${album?.name || "Album"} · PICORA`);
  const [choice, setChoice] = useState(album?.templateId || "");
  const [previewId, setPreviewId] = useState<string | null>(null);

  if (!album) return <AlbumNotFound />;
  const changed = choice !== album.templateId;

  const apply = () => {
    setAlbumTemplate(album.id, choice);
    toast(`Đã áp dụng ${getTemplateMeta(choice).name}. Liên kết của khách không đổi.`);
  };

  return (
    <>
      <PageHeader
        title="Đổi giao diện"
        description={`${album.name} · Chỉ thay đổi cách trình bày album.`}
        actions={
          <Link href={galleryPath(album)} className={ui.secondary}>
            <Icon name="eye" className="h-4 w-4" /> Mở album
          </Link>
        }
      />
      <div>
        <TemplateSelector selected={choice} current={album.templateId} selectLabel={SELECT_LABEL} onSelect={setChoice} onPreview={setPreviewId} />
      </div>
      <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-col gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center md:-mx-8 md:px-8">
        <p className="text-sm text-mist">
          {changed ? (
            <>
              Chuyển sang <span className="font-semibold text-ink">{getTemplateMeta(choice).name}</span>. Ảnh, thông tin và liên kết của khách vẫn giữ nguyên.
            </>
          ) : (
            <>
              Khách hàng đang thấy giao diện <span className="font-semibold text-ink">{getTemplateMeta(album.templateId).name}</span>.
            </>
          )}
        </p>
        <div className="flex gap-2 sm:ml-auto">
          <button type="button" onClick={() => setPreviewId(choice)} className={ui.secondary}>
            <Icon name="eye" className="h-4 w-4" /> Xem trước
          </button>
          <button type="button" onClick={apply} className={ui.primary} disabled={!changed}>
            Áp dụng giao diện
          </button>
        </div>
      </div>
      {previewId ? (
        <TemplatePreview
          templateId={previewId}
          srcFor={(templateId: string) => previewSrc(album, templateId)}
          selectedId={choice}
          selectLabel={SELECT_LABEL}
          onSelect={setChoice}
          onClose={() => setPreviewId(null)}
        />
      ) : null}
    </>
  );
}
