"use client";

import { formatLongDate, plural } from "@/lib/format";
import { Icon } from "../ui/Icon";
import { useGallery } from "./GalleryActions";
import type { GalleryModel } from "./model";

export function albumMeta(model: GalleryModel) {
  return {
    date: formatLongDate(model.shootingDate),
    count: plural(model.photoCount, "photo"),
    year: model.shootingDate ? model.shootingDate.slice(0, 4) : "",
    showCustomer: Boolean(model.customerName && model.customerName !== model.title),
  };
}

export function DownloadAllButton({
  className,
  label = "Tải cả album",
  short = "Tải về",
  iconClass = "h-4 w-4",
}: {
  className: string;
  label?: string;
  short?: string;
  iconClass?: string;
}) {
  const { model, downloadAll } = useGallery();
  if (!model.settings.allowDownload || !model.photoCount) return null;
  return (
    <button type="button" onClick={downloadAll} className={className}>
      <Icon name="download" className={iconClass} />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{short}</span>
    </button>
  );
}
