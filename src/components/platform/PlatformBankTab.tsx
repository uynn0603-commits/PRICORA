"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { bankLabel, isBankConfigured, VIETQR_BANKS, vietQrUrl } from "@/lib/billing";
import { toast } from "@/lib/overlay";
import { savePlatformBank } from "@/lib/store";
import type { PlatformBank } from "@/lib/types";
import { ui } from "@/lib/ui";

export function PlatformBankTab({ initial }: { initial: PlatformBank }) {
  const [bankId, setBankId] = useState(initial.bankId || "MB");
  const [bankAccount, setBankAccount] = useState(initial.bankAccount || "");
  const [accountName, setAccountName] = useState(initial.accountName || "");
  const [transferPrefix, setTransferPrefix] = useState(initial.transferPrefix || "PICORA");
  const [saving, setSaving] = useState(false);

  const previewBank: PlatformBank = {
    bankId,
    bankAccount: bankAccount.trim(),
    accountName: accountName.trim().toUpperCase(),
    transferPrefix: transferPrefix.trim().toUpperCase() || "PICORA",
  };
  const configured = isBankConfigured(previewBank);
  const sampleMemo = `${previewBank.transferPrefix} STUDIO PRO 8A2F`;
  const qrSrc = configured ? vietQrUrl(previewBank, 199000, sampleMemo) : "";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const result = await savePlatformBank(previewBank);
    setSaving(false);
    if (!result.ok) return toast(result.error, "error");
    toast("Đã lưu tài khoản ngân hàng nhận tiền");
  };

  return (
    <section className="mt-6 grid max-w-5xl gap-5 lg:grid-cols-5">
      <form onSubmit={submit} className={`${ui.card} space-y-4 p-5 sm:p-6 lg:col-span-3`}>
        <div>
          <h2 className="text-base font-semibold">Tài khoản nhận tiền (VietQR)</h2>
          <p className="mt-1 text-xs text-mist">
            Thông tin này được dùng để tự động tạo mã VietQR kèm đúng số tiền và nội dung chuyển khoản khi studio đổi gói hoặc gia hạn đầu tháng.
          </p>
        </div>

        <label className="block">
          <span className={ui.label}>Ngân hàng</span>
          <span className="relative block">
            <select
              value={bankId}
              onChange={(event) => setBankId(event.target.value)}
              className={`${ui.input} appearance-none pr-10`}
            >
              {VIETQR_BANKS.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.shortName} ({bank.id}) — {bank.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mist">
              <Icon name="chevron-down" className="h-4 w-4" />
            </span>
          </span>
        </label>

        <label className="block">
          <span className={ui.label}>Số tài khoản</span>
          <input
            type="text"
            value={bankAccount}
            onChange={(event) => setBankAccount(event.target.value)}
            placeholder="Ví dụ: 0123456789"
            className={`${ui.input} font-mono`}
            required
          />
        </label>

        <label className="block">
          <span className={ui.label}>Tên chủ tài khoản</span>
          <input
            type="text"
            value={accountName}
            onChange={(event) => setAccountName(event.target.value.toUpperCase())}
            placeholder="Ví dụ: NGUYEN VAN A"
            className={ui.input}
            required
          />
          <span className="mt-1 block text-xs text-mist">Nên viết hoa không dấu đúng theo tên tài khoản ngân hàng.</span>
        </label>

        <label className="block">
          <span className={ui.label}>Tiền tố nội dung chuyển khoản</span>
          <input
            type="text"
            value={transferPrefix}
            onChange={(event) => setTransferPrefix(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16))}
            placeholder="PICORA"
            className={`${ui.input} font-mono`}
          />
          <span className="mt-1 block text-xs text-mist">Mẫu nội dung gửi studio: {sampleMemo}</span>
        </label>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving} className={ui.primary}>
            <Icon name="check" className="h-4 w-4" /> {saving ? "Đang lưu…" : "Lưu thông tin nhận tiền"}
          </button>
        </div>
      </form>

      <aside className={`${ui.card} flex flex-col items-center justify-center p-5 text-center sm:p-6 lg:col-span-2`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-mist">Xem trước mã VietQR (199.000đ)</p>
        {configured ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="Xem trước mã VietQR" className="mt-4 w-full max-w-[240px] rounded-xl border border-line bg-white object-contain" />
            <p className="mt-3 text-sm font-semibold text-ink">{bankLabel(previewBank.bankId)}</p>
            <p className="font-mono text-xs text-mist">{previewBank.bankAccount}</p>
            {previewBank.accountName ? <p className="mt-0.5 text-xs font-medium text-ink">{previewBank.accountName}</p> : null}
          </>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-line bg-canvas px-4 py-10 text-xs text-mist">
            Nhập ngân hàng và số tài khoản để xem trước mã VietQR.
          </div>
        )}
      </aside>
    </section>
  );
}
