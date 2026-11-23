"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatVNDate, formatVNDateTime, formatVND, nextCycleExpiry } from "@/lib/billing";
import { cn } from "@/lib/format";
import { confirmDialog, openModal, toast } from "@/lib/overlay";
import { getPlanById } from "@/lib/plans";
import { approvePaymentRequest, rejectPaymentRequest } from "@/lib/store";
import type { PaymentStatus, PlatformPaymentRequest } from "@/lib/types";
import { ui } from "@/lib/ui";

const STATUS_BADGE: Record<PaymentStatus, { label: string; className: string }> = {
  pending: { label: "Chờ duyệt", className: "bg-amber-50 text-amber-800 border-amber-200" },
  approved: { label: "Đã duyệt", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Đã từ chối", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

const QUICK_REASONS = ["Chưa thấy tiền vào tài khoản", "Ảnh chụp chưa rõ nội dung / số tiền", "Sai số tiền chuyển khoản"];

function RejectDialog({ request, onClose }: { request: PlatformPaymentRequest; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const clean = note.trim();
    if (!clean) return toast("Vui lòng nhập lý do từ chối.", "error");
    setBusy(true);
    const result = await rejectPaymentRequest(request.id, clean);
    setBusy(false);
    if (!result.ok) return toast(result.error, "error");
    toast("Đã từ chối yêu cầu thanh toán");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[75] grid place-items-center bg-ink/40 px-4"
      onClick={(event) => event.target === event.currentTarget && !busy && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6" role="dialog" aria-modal="true" aria-labelledby="reject-title">
        <div className="flex items-start justify-between gap-4">
          <h2 id="reject-title" className="text-lg font-semibold tracking-tight">
            Từ chối yêu cầu của {request.studioName}
          </h2>
          <button type="button" onClick={onClose} disabled={busy} className="grid h-8 w-8 place-items-center rounded-lg text-mist hover:bg-canvas" aria-label="Đóng">
            <Icon name="x" />
          </button>
        </div>
        <p className="mt-1 text-sm text-mist">Lý do sẽ hiển thị cho chủ studio biết để kiểm tra và gửi lại.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {QUICK_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => setNote(reason)}
              className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-ink hover:border-primary/40"
            >
              {reason}
            </button>
          ))}
        </div>
        <label className="mt-3 block">
          <span className={ui.label}>Lý do từ chối</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 500))}
            rows={3}
            placeholder="Nhập lý do cụ thể..."
            className={cn(ui.input, "h-auto py-2.5")}
            autoFocus
          />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={ui.secondary}>
            Hủy
          </button>
          <button type="button" onClick={() => void submit()} disabled={busy || !note.trim()} className={ui.danger}>
            {busy ? "Đang xử lý…" : "Xác nhận từ chối"}
          </button>
        </div>
      </div>
    </div>
  );
}

function previewReceipt(item: PlatformPaymentRequest) {
  openModal({
    title: `Ảnh chuyển khoản · ${item.studioName}`,
    body: (
      <div className="space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.receiptUrl} alt="Ảnh xác nhận chuyển khoản" className="max-h-[65svh] w-full rounded-xl border border-line bg-canvas object-contain" />
        <div className="rounded-xl bg-canvas px-3.5 py-2.5 text-xs text-mist">
          <p>
            Số tiền: <strong className="text-ink">{formatVND(item.amount)}</strong> · Mã CK:{" "}
            <strong className="font-mono text-ink">{item.transferCode}</strong>
          </p>
          <p className="mt-0.5">
            Người gửi: {item.submitterName || "—"} ({item.submitterEmail || "—"}) · {formatVNDateTime(item.createdAt)}
          </p>
        </div>
      </div>
    ),
    actions: [{ label: "Đóng", kind: "primary" }],
  });
}

export function PlatformPaymentsTab({ requests }: { requests: PlatformPaymentRequest[] }) {
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [busyId, setBusyId] = useState("");
  const [rejecting, setRejecting] = useState<PlatformPaymentRequest | null>(null);

  const pendingCount = requests.filter((item) => item.status === "pending").length;
  const visible = filter === "pending" ? requests.filter((item) => item.status === "pending") : requests;

  const approve = async (item: PlatformPaymentRequest) => {
    const targetPlan = getPlanById(item.targetPlanId);
    const nextExpiry = nextCycleExpiry(item.currentPlanId, item.currentPlanExpiresAt, item.targetPlanId, item.kind);
    const ok = await confirmDialog({
      title: `Duyệt thanh toán cho ${item.studioName}?`,
      message: `${item.kind === "renew" ? "Gia hạn" : "Chuyển sang"} gói ${targetPlan.name} (${formatVND(item.amount)}). Gói sẽ có hiệu lực đến ${formatVNDate(nextExpiry)}.`,
      confirmText: "Duyệt ngay",
    });
    if (!ok) return;
    setBusyId(item.id);
    const result = await approvePaymentRequest(item.id);
    setBusyId("");
    if (!result.ok) return toast(result.error || "Không thể duyệt yêu cầu.", "error");
    toast(result.warning ? `Đã duyệt. Lưu ý: ${result.warning}` : `Đã duyệt gói ${targetPlan.name} cho ${item.studioName}`);
  };

  return (
    <section className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-line bg-white p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={cn("inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5", filter === "pending" ? "bg-ink text-white" : "text-mist hover:text-ink")}
          >
            Chờ duyệt <span className="tabular-nums">({pendingCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn("inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5", filter === "all" ? "bg-ink text-white" : "text-mist hover:text-ink")}
          >
            Tất cả <span className="tabular-nums">({requests.length})</span>
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className={`${ui.card} px-6 py-14 text-center`}>
          <p className="text-base font-semibold">{filter === "pending" ? "Không có yêu cầu nào đang chờ duyệt" : "Chưa có yêu cầu thanh toán nào"}</p>
          <p className="mt-1 text-sm text-mist">Khi studio gửi ảnh xác nhận chuyển khoản đổi gói hoặc gia hạn, yêu cầu sẽ hiện tại đây.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => {
            const badge = STATUS_BADGE[item.status];
            const targetPlan = getPlanById(item.targetPlanId);
            const currentPlan = getPlanById(item.currentPlanId);
            const nextExpiry = item.status === "pending" ? nextCycleExpiry(item.currentPlanId, item.currentPlanExpiresAt, item.targetPlanId, item.kind) : null;
            const busy = busyId === item.id;

            return (
              <article key={item.id} className={`${ui.card} p-5`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <button
                      type="button"
                      onClick={() => previewReceipt(item)}
                      className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-canvas"
                      aria-label="Phóng to ảnh chuyển khoản"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.receiptUrl} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      <span className="absolute inset-x-0 bottom-0 bg-ink/60 py-0.5 text-center text-[10px] font-semibold text-white">Xem ảnh</span>
                    </button>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                        <span className="text-sm font-semibold text-ink">{item.studioName}</span>
                        <span className="text-xs text-mist">/s/{item.studioSlug}</span>
                      </div>
                      <p className="text-sm text-ink">
                        <span className="font-semibold">
                          {item.kind === "renew" ? `Gia hạn gói ${targetPlan.name}` : `Chuyển ${currentPlan.name} → ${targetPlan.name}`}
                        </span>{" "}
                        · <span className="font-semibold text-primary">{formatVND(item.amount)}</span>
                        {nextExpiry ? <span className="text-xs text-mist"> · sau duyệt đến {formatVNDate(nextExpiry)}</span> : null}
                        {item.status === "approved" && item.appliedExpiresAt ? (
                          <span className="text-xs text-emerald-700"> · hiệu lực đến {formatVNDate(item.appliedExpiresAt)}</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-mist">
                        Mã CK: <span className="font-mono font-semibold text-ink">{item.transferCode}</span> · Gửi bởi {item.submitterName || item.submitterEmail || "—"} lúc{" "}
                        {formatVNDateTime(item.createdAt)}
                      </p>
                      {item.note ? <p className="text-xs text-ink">Ghi chú studio: {item.note}</p> : null}
                      {item.adminNote ? (
                        <p className={cn("text-xs", item.status === "rejected" ? "font-medium text-rose-600" : "text-mist")}>
                          Phản hồi quản trị: {item.adminNote}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {item.status === "pending" ? (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button type="button" onClick={() => setRejecting(item)} disabled={busy} className={cn(ui.secondary, "text-rose-600 hover:bg-rose-50")}>
                        <Icon name="x" className="h-4 w-4" /> Từ chối
                      </button>
                      <button type="button" onClick={() => void approve(item)} disabled={busy} className={ui.primary}>
                        <Icon name="check" className="h-4 w-4" /> {busy ? "Đang duyệt…" : "Duyệt thanh toán"}
                      </button>
                    </div>
                  ) : (
                    <div className="shrink-0 text-right text-xs text-mist">
                      {item.reviewedAt ? `Xử lý lúc ${formatVNDateTime(item.reviewedAt)}` : null}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {rejecting ? <RejectDialog request={rejecting} onClose={() => setRejecting(null)} /> : null}
    </section>
  );
}
