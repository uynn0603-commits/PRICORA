"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/fields";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatBytes, formatDate, plural } from "@/lib/format";
import { effectiveStatus, getPlan, isOwner, storageStats } from "@/lib/store";
import { ui } from "@/lib/ui";
import { useStore, useTitle } from "@/lib/use-store";

export default function StoragePage() {
  useStore();
  useTitle("Lưu trữ · PICORA");
  const stats = storageStats();
  const percent = Math.min(100, Math.round(stats.ratio * 100));
  const bar = stats.ratio >= 0.95 ? "bg-rose-500" : stats.ratio >= 0.8 ? "bg-amber-500" : "bg-primary";
  const plan = getPlan();
  const planLink = isOwner() ? (
    <Link href="/admin/settings?tab=plan" className={ui.secondary}>
      <Icon name="credit-card" className="h-4 w-4" /> Gói dịch vụ
    </Link>
  ) : null;

  return (
    <>
      <PageHeader title="Lưu trữ" description={`Xem mỗi album đang dùng bao nhiêu dung lượng trong gói ${plan.name} của studio.`} actions={planLink} />
      {stats.ratio >= 0.8 && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          <p className="font-semibold">Dung lượng sắp đầy</p>
          <p className="mt-1">
            Bạn đang dùng {percent}% trên tổng {formatBytes(stats.quota)} của gói {plan.name}. Hãy xóa những ảnh không còn cần giao, hoặc nâng cấp gói để có thêm dung lượng.
          </p>
        </div>
      )}
      <section className="grid gap-4 md:grid-cols-3">
        {[
          [`Dung lượng gói ${plan.name}`, formatBytes(stats.quota), "bg-violet-100 text-violet-600", "hard-drive"],
          ["Đã sử dụng", formatBytes(stats.used), "bg-amber-100 text-amber-600", "image"],
          ["Còn trống", formatBytes(stats.available), "bg-emerald-100 text-emerald-600", "circle-check"],
        ].map(([label, value, tone, icon]) => (
          <article key={label} className={`${ui.card} p-5`}>
            <span className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-medium text-mist">{label}</span>
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}>
                <Icon name={icon} className="h-4 w-4" />
              </span>
            </span>
            <p className="mt-4 text-[28px] font-semibold tracking-tight">{value}</p>
          </article>
        ))}
      </section>
      <section className={`${ui.card} mt-4 p-5`}>
        <div className="flex items-center justify-between text-sm">
          <p className="font-semibold">Mức sử dụng</p>
          <p className="text-mist">{percent}%</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${percent}%` }}></div>
        </div>
      </section>
      <section className={`${ui.card} mt-4 overflow-hidden`}>
        <div className="hidden grid-cols-[1.4fr_.6fr_.7fr_.7fr] gap-3 border-b border-line px-5 py-3 text-xs font-semibold text-mist md:grid">
          <span>Album</span>
          <span>Số ảnh</span>
          <span>Dung lượng</span>
          <span>Cập nhật</span>
        </div>
        <div className="divide-y divide-line">
          {stats.rows.map((row) => (
            <Link
              key={row.album.id}
              href={`/admin/albums/${row.album.id}/photos`}
              className="grid gap-2 px-5 py-4 hover:bg-canvas md:grid-cols-[1.4fr_.6fr_.7fr_.7fr] md:items-center"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate font-semibold">{row.album.name}</span>
                  <span className="hidden sm:inline">
                    <StatusBadge status={effectiveStatus(row.album)} />
                  </span>
                </span>
                <span className="mt-1 block truncate text-sm text-mist md:hidden">
                  {plural(row.photos, "photo")} · {formatBytes(row.bytes)}
                </span>
              </span>
              <span className="hidden text-sm md:block">{row.photos}</span>
              <span className="hidden text-sm font-medium md:block">{formatBytes(row.bytes)}</span>
              <span className="hidden text-sm text-mist md:block">{formatDate(row.album.updatedAt)}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
