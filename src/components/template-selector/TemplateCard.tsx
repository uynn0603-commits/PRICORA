"use client";

import type { TemplateMeta } from "@/lib/catalog";
import { getDemoAlbum } from "@/lib/template-demos";
import { ui } from "@/lib/ui";
import { toGalleryModel, type GalleryModel } from "../gallery/model";
import { getTemplateThumbnail } from "../templates";
import { Icon } from "../ui/Icon";

const demoModels = new Map<string, GalleryModel | null>();

function demoModel(templateId: string): GalleryModel | null {
  if (!demoModels.has(templateId)) {
    const demo = getDemoAlbum(templateId);
    demoModels.set(templateId, demo ? toGalleryModel(demo) : null);
  }
  return demoModels.get(templateId) ?? null;
}

export function TemplateThumbnail({ templateId }: { templateId: string }) {
  const model = demoModel(templateId);
  if (!model) return null;
  const Thumbnail = getTemplateThumbnail(templateId);
  return <Thumbnail model={model} />;
}

export function TemplateCard({
  meta,
  selected = false,
  suggested = false,
  current = false,
  selectLabel = "Chọn giao diện",
  onSelect,
  onPreview,
}: {
  meta: TemplateMeta;
  selected?: boolean;
  suggested?: boolean;
  current?: boolean;
  selectLabel?: string;
  onSelect: (id: string) => void;
  onPreview: (id: string) => void;
}) {
  const ring = selected ? "border-primary shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand-primary)_14%,transparent)]" : "border-line hover:border-primary/40";
  return (
    <article className={`relative flex flex-col overflow-hidden rounded-2xl border-2 bg-white transition ${ring}`}>
      {selected && (
        <span className="absolute right-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-primary text-white shadow-sm" aria-hidden="true">
          <Icon name="check" className="h-4 w-4" />
        </span>
      )}
      <button type="button" onClick={() => onPreview(meta.id)} className="block aspect-[4/3] overflow-hidden border-b border-line text-left" aria-label={`Xem trước ${meta.name}`}>
        <div className="pointer-events-none h-full select-none transition duration-500 hover:scale-[1.01]">
          <TemplateThumbnail templateId={meta.id} />
        </div>
      </button>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{meta.name}</h3>
          {current && <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">Đang dùng</span>}
          {suggested && !current && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              <Icon name="sparkles" className="h-3 w-3" /> Gợi ý
            </span>
          )}
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-mist">{meta.description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {meta.style.map((tag) => (
            <span key={tag} className="rounded-md bg-canvas px-2 py-1 text-[11px] font-medium text-ink/80">
              {tag}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-mist">
          Phù hợp: <span className="text-ink">{meta.bestFor.join(", ")}</span>
        </p>
        <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
          <button type="button" onClick={() => onPreview(meta.id)} className={`${ui.secondary} h-10 whitespace-nowrap px-2 text-[13px]`}>
            <Icon name="eye" className="h-4 w-4" /> Xem trước
          </button>
          <button
            type="button"
            onClick={() => onSelect(meta.id)}
            className={`${selected ? `${ui.secondary} border-primary text-primary` : ui.primary} h-10 whitespace-nowrap px-2 text-[13px]`}
            aria-pressed={selected}
          >
            {selected ? (
              <>
                <Icon name="check" className="h-4 w-4" /> Đã chọn
              </>
            ) : (
              selectLabel
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
