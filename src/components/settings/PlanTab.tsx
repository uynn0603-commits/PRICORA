"use client";

import { Icon } from "@/components/ui/Icon";
import { formatBytes } from "@/lib/format";
import { confirmDialog, toast } from "@/lib/overlay";
import { formatPrice, limitLabel, PLANS } from "@/lib/plans";
import { changePlan, getPlan, studioUsage } from "@/lib/store";
import { ui } from "@/lib/ui";
import type { Reload } from "./types";

const count = (value: number) => value.toLocaleString("vi-VN");

function Meter({ label, used, limit, format = count }: { label: string; used: number; limit: number | null; format?: (value: number) => string }) {
  const ratio = limit == null ? 0 : Math.min(1, used / limit);
  const tone = ratio >= 0.95 ? "bg-rose-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-primary";
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-mist">
          {format(used)} / {limit == null ? "Không giới hạn" : format(limit)}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${limit == null ? 4 : Math.max(2, Math.round(ratio * 100))}%` }}></div>
      </div>
    </div>
  );
}

export function PlanTab({ reload }: { reload: Reload }) {
  const current = getPlan();
  const usage = studioUsage();

  const choose = async (planId: string) => {
    const target = PLANS.find((item) => item.id === planId);
    if (!target) return;
    const ok = await confirmDialog({
      title: `Chuyển sang gói ${target.name}?`,
      message: `Giới hạn mới: ${formatBytes(target.storage)} lưu trữ, ${limitLabel(target.albums, "album")}, ${limitLabel(target.members, "thành viên")}.`,
      confirmText: "Xác nhận đổi gói",
    });
    if (!ok) return;
    const result = await changePlan(target.id);
    if (!result.ok) return toast(result.error, "error");
    toast(`Studio đã chuyển sang gói ${result.plan.name}`);
    reload("plan");
  };

  return (
    <>
      <section className={`${ui.card} max-w-5xl p-5 sm:p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm text-mist">Gói hiện tại</p>
            <h2 className="mt-1 text-xl font-semibold">
              {current.name}
              {current.price ? (
                <>
                  {" "}
                  <span className="text-base font-normal text-mist">· {formatPrice(current.price)}</span>
                </>
              ) : null}
            </h2>
          </div>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <Meter label="Dung lượng" used={usage.storage} limit={current.storage} format={formatBytes} />
          <Meter label="Album" used={usage.albums} limit={current.albums} />
          <Meter label="Thành viên" used={usage.members} limit={current.members} />
        </div>
      </section>
      <section className="mt-4 grid max-w-5xl gap-4 md:grid-cols-3">
        {PLANS.map((item) => {
          const active = item.id === current.id;
          const upgrade = item.price > current.price;
          return (
            <article key={item.id} className={`flex flex-col rounded-2xl border-2 bg-white p-5 ${active ? "border-primary" : "border-line"}`}>
              <h3 className="text-lg font-semibold">{item.name}</h3>
              <p className="mt-1 text-sm text-mist">{item.description}</p>
              <p className="mt-4 text-2xl font-semibold tracking-tight">{formatPrice(item.price)}</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex gap-2">
                  <Icon name="check" className="h-4 w-4 shrink-0 text-primary" /> {formatBytes(item.storage)} lưu trữ
                </li>
                <li className="flex gap-2">
                  <Icon name="check" className="h-4 w-4 shrink-0 text-primary" /> {limitLabel(item.albums, "album")}
                </li>
                <li className="flex gap-2">
                  <Icon name="check" className="h-4 w-4 shrink-0 text-primary" /> {limitLabel(item.members, "thành viên")}
                </li>
                <li className="flex gap-2">
                  <Icon name="check" className="h-4 w-4 shrink-0 text-primary" /> 4 giao diện album cao cấp
                </li>
              </ul>
              <div className="mt-auto pt-5">
                {active ? (
                  <span className={`${ui.secondary} w-full cursor-default border-primary text-primary`}>
                    <Icon name="check" className="h-4 w-4" /> Đang dùng
                  </span>
                ) : (
                  <button type="button" onClick={() => choose(item.id)} className={`${upgrade ? ui.primary : ui.secondary} w-full`}>
                    {upgrade ? "Nâng cấp" : "Chuyển xuống"} gói {item.name}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>
      <p className="mt-4 max-w-5xl text-xs text-mist">Bản demo chưa tích hợp thanh toán. Gói mới có hiệu lực ngay khi bạn xác nhận.</p>
    </>
  );
}
