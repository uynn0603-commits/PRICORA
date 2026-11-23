import { formatLongDate, plural } from "../../utils/format.js";
import { icon } from "../icons.js";

export function albumMeta(model) {
  return {
    date: formatLongDate(model.shootingDate),
    count: plural(model.photos.length, "photo"),
    year: model.shootingDate ? model.shootingDate.slice(0, 4) : "",
    showCustomer: Boolean(model.customerName && model.customerName !== model.title),
  };
}

export function downloadAllButton(model, { className, label = "Tải cả album", short = "Tải về", iconClass = "h-4 w-4" }) {
  if (!model.settings.allowDownload || !model.photos.length) return "";
  return `<button type="button" data-download-all class="${className}">${icon("download", iconClass)}<span class="hidden sm:inline">${label}</span><span class="sm:hidden">${short}</span></button>`;
}
