"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  bankLabel,
  formatVNDate,
  formatVND,
  isBankConfigured,
  makeTransferCode,
  nextCycleExpiry,
  vietQrUrl,
} from "@/lib/billing";
import { cn, formatBytes } from "@/lib/format";
import { toast } from "@/lib/overlay";
import { submitPaymentRequest } from "@/lib/store";
import type { PaymentKind, Plan, PlatformBank, Studio } from "@/lib/types";
import { ui } from "@/lib/ui";

function CopyRow({ label, value, display, mono = false }: { label: string; value: string; display?: string; mono?: boolean }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast(`Đã sao chép ${label.toLowerCase()}`);
    } catch {
      toast("Trình duyệt không cho phép sao chép.", "error");
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="shrink-0 text-mist">{label}</span>
      <span className="flex min-w-0 items-center gap-1.5">
        <span className={cn("truncate font-semibold text-ink", mono && "font-mono text-xs")}>{display || value}</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-mist hover:bg-canvas hover:text-ink"
          aria-label={`Sao chép ${label}`}
        >
          <Icon name="copy" className="h-3.5 w-3.5" />
        </button>
      </span>
    </div>
  );
}

export function PaymentDialog({
  studio,
  target,
  kind,
  bank,
  onClose,
  onSubmitted,
}: {
  studio: Studio;
  target: Plan;
  kind: PaymentKind;
  bank: PlatformBank | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const transferCode = useMemo(() => makeTransferCode(bank?.transferPrefix || "PICORA", studio.slug, target.id), [bank?.transferPrefix, studio.slug, target.id]);
  const expectedExpiry = useMemo(() => nextCycleExpiry(studio.planId, studio.planExpiresAt, target.id, kind), [studio.planId, studio.planExpiresAt, target.id, kind]);
  const configured = isBankConfigured(bank);
  const qrSrc = configured && bank ? vietQrUrl(bank, target.price, transferCode) : "";

  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const submit = async () => {
    if (!file) return toast("Vui lòng tải lên ảnh xác nhận chuyển khoản.", "error");
    setBusy(true);
    const result = await submitPaymentRequest({
      file,
      targetPlanId: target.id,
      kind,
      transferCode,
      note: note.trim(),
    });
    setBusy(false);
    if (!result.ok) return toast(result.error, "error");
    toast("Đã gửi ảnh xác nhận. Trạng thái: Đợi quản trị viên duyệt.");
    onSubmitted();
  };

  return (
    <div
      className="fixed inset-0 z-[75] grid place-items-center bg-ink/40 px-4 py-4"
      onClick={(event) => event.target === event.currentTarget && !busy && onClose()}
    >
      <div
        className="max-h-[92svh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-dialog-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="payment-dialog-title" className="text-lg font-semibold tracking-tight">
              {kind === "renew" ? `Gia hạn gói ${target.name}` : `Chuyển sang gói ${target.name}`}
            </h2>
            <p className="mt-0.5 text-sm text-mist">
              Số tiền <span className="font-semibold text-ink">{formatVND(target.price)}</span>
              {expectedExpiry ? (
                <>
                  {" "}
                  · hiệu lực đến <span className="font-semibold text-ink">{formatVNDate(expectedExpiry)}</span> sau khi duyệt
                </>
              ) : null}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="grid h-8 w-8 place-items-center rounded-lg text-mist hover:bg-canvas" aria-label="Đóng">
            <Icon name="x" />
          </button>
        </div>

        {!configured || !bank ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Chưa có thông tin tài khoản nhận tiền</p>
            <p className="mt-1 text-amber-800">
              Quản trị nền tảng chưa cấu hình tài khoản ngân hàng VietQR. Vui lòng liên hệ quản trị viên để cập nhật trước khi chuyển khoản.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="flex flex-col items-center rounded-xl border border-line bg-canvas/60 p-4 text-center">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-mist">
                <Icon name="qr-code" className="h-3.5 w-3.5" /> Bước 1 · Quét mã VietQR
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt={`Mã VietQR chuyển khoản ${formatVND(target.price)}`}
                className="mt-3 w-full max-w-[230px] rounded-xl border border-line bg-white object-contain"
              />
              <p className="mt-2.5 text-xs text-mist">Mã QR đã điền sẵn số tiền và nội dung chuyển khoản.</p>
            </div>

            <div className="flex flex-col justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-mist">Thông tin chuyển khoản</p>
                <div className="mt-1 divide-y divide-line rounded-xl border border-line bg-white px-3.5">
                  <div className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="shrink-0 text-mist">Ngân hàng</span>
                    <span className="truncate font-semibold text-ink">{bankLabel(bank.bankId)}</span>
                  </div>
                  <CopyRow label="Số tài khoản" value={bank.bankAccount} mono />
                  {bank.accountName ? (
                    <div className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="shrink-0 text-mist">Chủ tài khoản</span>
                      <span className="truncate font-semibold text-ink">{bank.accountName}</span>
                    </div>
                  ) : null}
                  <CopyRow label="Số tiền" value={String(target.price)} display={formatVND(target.price)} />
                  <CopyRow label="Nội dung CK" value={transferCode} mono />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-mist">Bước 2 · Tải ảnh xác nhận chuyển khoản</p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={busy}
                  className="mt-2 flex w-full items-center gap-3 rounded-xl border border-dashed border-line bg-white px-3.5 py-3 text-left hover:bg-canvas"
                >
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover" />
                  ) : (
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-canvas text-mist">
                      <Icon name="upload" className="h-5 w-5" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {file ? file.name : "Chọn ảnh chụp màn hình chuyển khoản"}
                    </span>
                    <span className="block text-xs text-mist">
                      {file ? `${formatBytes(file.size)} · Bấm để đổi ảnh khác` : "JPG, PNG hoặc WEBP, tối đa 10 MB"}
                    </span>
                  </span>
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const picked = event.target.files?.[0];
                    if (picked) setFile(picked);
                    event.target.value = "";
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {configured ? (
          <label className="mt-4 block">
            <span className={ui.label}>Ghi chú thêm (không bắt buộc)</span>
            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 500))}
              placeholder="Ví dụ: Đã chuyển khoản lúc 17:50 từ tài khoản công ty..."
              className={ui.input}
            />
          </label>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
          <button type="button" onClick={onClose} disabled={busy} className={ui.secondary}>
            Đóng
          </button>
          {configured ? (
            <button type="button" onClick={() => void submit()} disabled={busy || !file} className={ui.primary}>
              <Icon name={busy ? "loader" : "send"} className={cn("h-4 w-4", busy && "animate-spin")} />
              {busy ? "Đang gửi xác nhận…" : "Gửi ảnh xác nhận"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
