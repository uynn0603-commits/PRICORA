import type { EffectiveStatus } from "@/lib/types";

const STYLES: Record<EffectiveStatus, string> = {
  published: "bg-emerald-50 text-emerald-700",
  draft: "bg-[#F1F0F6] text-mist",
  hidden: "bg-amber-50 text-amber-800",
  expired: "bg-rose-50 text-rose-600",
};

const LABELS: Record<EffectiveStatus, string> = {
  published: "Đã xuất bản",
  draft: "Bản nháp",
  hidden: "Đã ẩn",
  expired: "Hết hạn",
};

export function statusLabel(status?: string): string {
  return LABELS[status as EffectiveStatus] || LABELS.draft;
}

export function StatusBadge({ status }: { status?: string }) {
  const key: EffectiveStatus = status && status in STYLES ? (status as EffectiveStatus) : "draft";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${STYLES[key]}`}>{LABELS[key]}</span>;
}
