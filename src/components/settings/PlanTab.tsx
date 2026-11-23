"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  daysUntilPlanExpiry,
  formatVNDate,
  formatVNDateTime,
  formatVND,
  isPlanExpired,
  isPlanExpiringSoon,
} from "@/lib/billing";
import { cn, formatBytes } from "@/lib/format";
import { confirmDialog, openModal, toast } from "@/lib/overlay";
import { formatPrice, getPlanById, limitLabel, PLANS } from "@/lib/plans";
import {
  cancelPaymentRequest,
  changePlan,
  currentStudio,
  getPlan,
  getStudioBilling,
  hydrate,
  loadStudioBilling,
  studioUsage,
} from "@/lib/store";
import type { PaymentKind, PaymentRequest, PaymentStatus, Plan } from "@/lib/types";
import { ui } from "@/lib/ui";
import { PaymentDialog } from "./PaymentDialog";
import type { Reload } from "./types";

const count = (value: number) => value.toLocaleString("vi-VN");

const STATUS_BADGE: Record<PaymentStatus, { label: string; className: string }> = {
  pending: { label: "Đợi quản trị viên xác nhận", className: "bg-amber-50 text-amber-800 border-amber-200" },
  approved: { label: "Đã duyệt", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Từ chối", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

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

function previewReceipt(item: PaymentRequest) {
  openModal({
    title: `Ảnh chuyển khoản · ${item.transferCode}`,
    body: (
      <div className="space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.receiptUrl} alt="Ảnh xác nhận chuyển khoản" className="max-h-[65svh] w-full rounded-xl border border-line bg-canvas object-contain" />
        <p className="text-xs text-mist">
          Số tiền: <strong className="text-ink">{formatVND(item.amount)}</strong> · Gửi lúc {formatVNDateTime(item.createdAt)}
        </p>
      </div>
    ),
    actions: [{ label: "Đóng", kind: "primary" }],
  });
}

export function PlanTab({ reload }: { reload: Reload }) {
  const studio = currentStudio();
  const current = getPlan();
  const usage = studioUsage();
  const billing = getStudioBilling();
  const [paying, setPaying] = useState<{ target: Plan; kind: PaymentKind } | null>(null);
  const [cancellingId, setCancellingId] = useState("");

  useEffect(() => {
    void loadStudioBilling();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void hydrate().then(() => loadStudioBilling());
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  if (!studio) return null;

  const expired = isPlanExpired(studio);
  const expiringSoon = isPlanExpiringSoon(studio);
  const daysLeft = daysUntilPlanExpiry(studio);
  const pending = billing.requests.find((item) => item.status === "pending") || null;

  const choose = async (planId: string) => {
    const target = PLANS.find((item) => item.id === planId);
    if (!target) return;
    if (target.price === 0) {
      const ok = await confirmDialog({
        title: `Chuyển xuống gói ${target.name}?`,
        message: `Giới hạn mới: ${formatBytes(target.storage)} lưu trữ, ${limitLabel(target.albums, "album")}, ${limitLabel(target.members, "thành viên")}. Gói miễn phí có hiệu lực ngay.`,
        confirmText: "Xác nhận chuyển xuống",
      });
      if (!ok) return;
      const result = await changePlan(target.id);
      if (!result.ok) return toast(result.error, "error");
      toast(`Studio đã chuyển sang gói ${result.plan.name}`);
      reload("plan");
      return;
    }
    setPaying({ target, kind: "change" });
  };

  const cancelPending = async (req: PaymentRequest) => {
    const ok = await confirmDialog({
      title: "Hủy yêu cầu đang chờ duyệt?",
      message: "Bạn có thể gửi lại ảnh chuyển khoản mới hoặc chọn gói khác sau khi hủy.",
      confirmText: "Hủy yêu cầu",
      danger: true,
    });
    if (!ok) return;
    setCancellingId(req.id);
    const result = await cancelPaymentRequest(req.id);
    setCancellingId("");
    if (!result.ok) return toast(result.error, "error");
    toast("Đã hủy yêu cầu thanh toán");
  };

  return (
    <>
      <section className={`${ui.card} max-w-5xl p-5 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-mist">Gói hiện tại</p>
            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-semibold">
                {current.name}
                {current.price ? (
                  <>
                    {" "}
                    <span className="text-base font-normal text-mist">· {formatPrice(current.price)}</span>
                  </>
                ) : null}
              </h2>
              {current.price > 0 && studio.planExpiresAt ? (
                expired ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                    <Icon name="circle-alert" className="h-3.5 w-3.5" /> Đã hết hạn · {formatVNDate(studio.planExpiresAt)}
                  </span>
                ) : expiringSoon ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    <Icon name="clock" className="h-3.5 w-3.5" /> Sắp hết hạn ({daysLeft} ngày · đến {formatVNDate(studio.planExpiresAt)})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    <Icon name="calendar" className="h-3.5 w-3.5" /> Hiệu lực đến {formatVNDate(studio.planExpiresAt)}
                  </span>
                )
              ) : (
                <span className="text-xs text-mist">Không giới hạn thời gian</span>
              )}
            </div>
          </div>
          {current.price > 0 ? (
            <button
              type="button"
              disabled={Boolean(pending)}
              onClick={() => setPaying({ target: current, kind: "renew" })}
              className={expired || expiringSoon ? ui.primary : ui.secondary}
            >
              <Icon name="qr-code" className="h-4 w-4" />
              {expired ? "Gia hạn ngay" : "Gia hạn tháng tiếp theo"}
            </button>
          ) : null}
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <Meter label="Dung lượng" used={usage.storage} limit={current.storage} format={formatBytes} />
          <Meter label="Album" used={usage.albums} limit={current.albums} />
          <Meter label="Thành viên" used={usage.members} limit={current.members} />
        </div>
      </section>

      {pending ? (
        <section className="mt-4 max-w-5xl rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <button
                type="button"
                onClick={() => previewReceipt(pending)}
                className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-amber-200 bg-white"
                aria-label="Xem ảnh chuyển khoản"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pending.receiptUrl} alt="" className="h-full w-full object-cover" />
              </button>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  <Icon name="clock" className="h-3.5 w-3.5" /> Đợi quản trị viên xác nhận
                </span>
                <p className="mt-1.5 text-sm font-semibold text-ink">
                  {pending.kind === "renew" ? "Gia hạn" : "Chuyển sang"} gói {getPlanById(pending.targetPlanId).name} · {formatVND(pending.amount)}
                </p>
                <p className="mt-0.5 text-xs text-mist">
                  Mã CK: <span className="font-mono font-semibold text-ink">{pending.transferCode}</span> · gửi lúc {formatVNDateTime(pending.createdAt)}
                </p>
                {pending.note ? <p className="mt-1 text-xs text-ink">Ghi chú: {pending.note}</p> : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button type="button" onClick={() => previewReceipt(pending)} className={ui.secondary}>
                <Icon name="eye" className="h-4 w-4" /> Xem ảnh CK
              </button>
              <button
                type="button"
                disabled={cancellingId === pending.id}
                onClick={() => void cancelPending(pending)}
                className={cn(ui.secondary, "text-rose-600 hover:bg-rose-50")}
              >
                <Icon name="x" className="h-4 w-4" /> Hủy yêu cầu
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-4 grid max-w-5xl gap-4 md:grid-cols-3">
        {PLANS.map((item) => {
          const active = item.id === current.id;
          const upgrade = item.price > current.price;
          const waitingThis = pending?.targetPlanId === item.id;
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
                  current.price > 0 && expired ? (
                    <button
                      type="button"
                      disabled={Boolean(pending)}
                      onClick={() => setPaying({ target: item, kind: "renew" })}
                      className={`${ui.primary} w-full`}
                    >
                      <Icon name="qr-code" className="h-4 w-4" />
                      {waitingThis ? "Đang chờ duyệt gia hạn" : "Gia hạn gói này"}
                    </button>
                  ) : (
                    <span className={`${ui.secondary} w-full cursor-default border-primary text-primary`}>
                      <Icon name="check" className="h-4 w-4" /> Đang dùng
                    </span>
                  )
                ) : (
                  <button
                    type="button"
                    disabled={Boolean(pending && item.price > 0)}
                    onClick={() => choose(item.id)}
                    className={`${upgrade ? ui.primary : ui.secondary} w-full`}
                  >
                    {waitingThis ? (
                      <>
                        <Icon name="clock" className="h-4 w-4" /> Đang chờ duyệt
                      </>
                    ) : (
                      <>
                        {item.price > 0 ? <Icon name="qr-code" className="h-4 w-4" /> : null}
                        {upgrade ? "Nâng cấp" : "Chuyển xuống"} gói {item.name}
                      </>
                    )}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {billing.requests.length > 0 ? (
        <section className={`${ui.card} mt-6 max-w-5xl overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-semibold">Lịch sử xác nhận chuyển khoản</h2>
            <span className="text-xs text-mist">{billing.requests.length} yêu cầu</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-line text-xs font-semibold uppercase tracking-wider text-mist">
                <tr>
                  <th className="px-5 py-3">Thời gian</th>
                  <th className="px-5 py-3">Yêu cầu</th>
                  <th className="px-5 py-3">Số tiền</th>
                  <th className="px-5 py-3">Mã CK</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3 text-right">Ảnh CK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {billing.requests.map((req) => {
                  const badge = STATUS_BADGE[req.status];
                  const targetPlan = getPlanById(req.targetPlanId);
                  return (
                    <tr key={req.id}>
                      <td className="whitespace-nowrap px-5 py-3.5 text-xs text-mist">{formatVNDateTime(req.createdAt)}</td>
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-ink">
                          {req.kind === "renew" ? "Gia hạn" : "Chuyển sang"} gói {targetPlan.name}
                        </span>
                        {req.status === "approved" && req.appliedExpiresAt ? (
                          <span className="block text-xs text-mist">Hiệu lực đến {formatVNDate(req.appliedExpiresAt)}</span>
                        ) : null}
                        {req.adminNote ? (
                          <span className={cn("mt-0.5 block text-xs", req.status === "rejected" ? "text-rose-600" : "text-mist")}>
                            Quản trị viên: {req.adminNote}
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-medium">{formatVND(req.amount)}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-mist">{req.transferCode}</td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        <button type="button" onClick={() => previewReceipt(req)} className={cn(ui.ghost, "h-8 px-2.5 text-xs")}>
                          <Icon name="eye" className="h-3.5 w-3.5" /> Xem
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <p className="mt-4 max-w-5xl text-xs text-mist">
        Gói trả phí được tính theo tháng dương lịch (hết hạn đầu tháng tiếp theo). Chuyển gói hoặc gia hạn sẽ có hiệu lực ngay sau khi quản trị viên duyệt ảnh xác nhận chuyển khoản.
      </p>

      {paying ? (
        <PaymentDialog
          studio={studio}
          target={paying.target}
          kind={paying.kind}
          bank={billing.bank}
          onClose={() => setPaying(null)}
          onSubmitted={() => setPaying(null)}
        />
      ) : null}
    </>
  );
}
