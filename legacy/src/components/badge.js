const STYLES = {
  published: "bg-emerald-50 text-emerald-700",
  draft: "bg-[#F1F0F6] text-mist",
  hidden: "bg-amber-50 text-amber-800",
  expired: "bg-rose-50 text-rose-600",
};

const LABELS = {
  published: "Đã xuất bản",
  draft: "Bản nháp",
  hidden: "Đã ẩn",
  expired: "Hết hạn",
};

export function statusLabel(status) {
  return LABELS[status] || LABELS.draft;
}

export function statusBadge(status) {
  const key = STYLES[status] ? status : "draft";
  return `<span class="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${STYLES[key]}">${LABELS[key]}</span>`;
}
