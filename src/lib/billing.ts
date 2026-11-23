import type { PaymentKind, PlatformBank, Studio } from "./types";

export interface VietQrBank {
  id: string;
  shortName: string;
  name: string;
}

// Common Vietnamese banks supported by VietQR (img.vietqr.io).
export const VIETQR_BANKS: VietQrBank[] = [
  { id: "VCB", shortName: "Vietcombank", name: "Ngân hàng TMCP Ngoại Thương Việt Nam" },
  { id: "TCB", shortName: "Techcombank", name: "Ngân hàng TMCP Kỹ Thương Việt Nam" },
  { id: "MB", shortName: "MBBank", name: "Ngân hàng TMCP Quân Đội" },
  { id: "BIDV", shortName: "BIDV", name: "Ngân hàng TMCP Đầu Tư và Phát Triển Việt Nam" },
  { id: "ICB", shortName: "VietinBank", name: "Ngân hàng TMCP Công Thương Việt Nam" },
  { id: "ACB", shortName: "ACB", name: "Ngân hàng TMCP Á Châu" },
  { id: "VPB", shortName: "VPBank", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng" },
  { id: "TPB", shortName: "TPBank", name: "Ngân hàng TMCP Tiên Phong" },
  { id: "STB", shortName: "Sacombank", name: "Ngân hàng TMCP Sài Gòn Thương Tín" },
  { id: "VBA", shortName: "Agribank", name: "Ngân hàng Nông Nghiệp và Phát Triển Nông Thôn" },
  { id: "VIB", shortName: "VIB", name: "Ngân hàng TMCP Quốc Tế Việt Nam" },
  { id: "HDB", shortName: "HDBank", name: "Ngân hàng TMCP Phát Triển TP.HCM" },
  { id: "SHB", shortName: "SHB", name: "Ngân hàng TMCP Sài Gòn - Hà Nội" },
  { id: "MSB", shortName: "MSB", name: "Ngân hàng TMCP Hàng Hải Việt Nam" },
  { id: "OCB", shortName: "OCB", name: "Ngân hàng TMCP Phương Đông" },
  { id: "LPB", shortName: "LPBank", name: "Ngân hàng TMCP Lộc Phát Việt Nam" },
  { id: "EIB", shortName: "Eximbank", name: "Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam" },
  { id: "CAKE", shortName: "CAKE by VPBank", name: "Ngân hàng số CAKE by VPBank" },
  { id: "TIMO", shortName: "Timo", name: "Ngân hàng số Timo by BVBank" },
];

export function bankLabel(bankId: string): string {
  const found = VIETQR_BANKS.find((bank) => bank.id.toUpperCase() === bankId.toUpperCase());
  return found ? `${found.shortName} (${found.id})` : bankId;
}

export function isBankConfigured(bank: PlatformBank | null | undefined): boolean {
  return Boolean(bank && bank.bankId.trim() && bank.bankAccount.trim());
}

export function vietQrUrl(bank: PlatformBank, amount: number, memo: string): string {
  if (!isBankConfigured(bank)) return "";
  const params = new URLSearchParams();
  if (amount > 0) params.set("amount", String(Math.round(amount)));
  if (memo.trim()) params.set("addInfo", memo.trim());
  if (bank.accountName.trim()) params.set("accountName", bank.accountName.trim());
  const id = encodeURIComponent(bank.bankId.trim());
  const account = encodeURIComponent(bank.bankAccount.trim().replace(/\s+/g, ""));
  return `https://img.vietqr.io/image/${id}-${account}-compact2.png?${params.toString()}`;
}

export function makeTransferCode(prefix: string, studioSlug: string, planId: string): string {
  const cleanPrefix = (prefix || "PICORA").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "PICORA";
  const slugPart = studioSlug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "STUDIO";
  const planPart = planId.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${cleanPrefix} ${slugPart} ${planPart} ${rand}`;
}

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

// 00:00:00 on the 1st of the next calendar month in Vietnam time (UTC+7).
export function startOfNextMonthVN(from: Date = new Date()): Date {
  const shifted = new Date(from.getTime() + VN_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  return new Date(Date.UTC(year, month + 1, 1, 0, 0, 0) - VN_OFFSET_MS);
}

// Paid plans run to the 1st of the next calendar month. Renewing before expiry stacks onto
// the existing expiry (e.g. paying late November extends from 01/12 to 01/01).
export function nextCycleExpiry(
  currentPlanId: string,
  currentExpiresAt: string | null | undefined,
  targetPlanId: string,
  kind: PaymentKind,
  now: Date = new Date(),
): Date | null {
  if (targetPlanId === "free") return null;
  if (kind === "renew" && currentPlanId === targetPlanId && currentExpiresAt) {
    const current = new Date(currentExpiresAt);
    if (!Number.isNaN(current.getTime()) && current.getTime() > now.getTime()) {
      return startOfNextMonthVN(current);
    }
  }
  return startOfNextMonthVN(now);
}

export function isPlanExpired(studio: Pick<Studio, "planId" | "planExpiresAt"> | null | undefined, now = Date.now()): boolean {
  if (!studio || studio.planId === "free" || !studio.planExpiresAt) return false;
  const ts = new Date(studio.planExpiresAt).getTime();
  return !Number.isNaN(ts) && ts <= now;
}

export function daysUntilPlanExpiry(studio: Pick<Studio, "planId" | "planExpiresAt"> | null | undefined, now = Date.now()): number | null {
  if (!studio || studio.planId === "free" || !studio.planExpiresAt) return null;
  const ts = new Date(studio.planExpiresAt).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.ceil((ts - now) / 86_400_000);
}

export function isPlanExpiringSoon(studio: Pick<Studio, "planId" | "planExpiresAt"> | null | undefined, now = Date.now()): boolean {
  const days = daysUntilPlanExpiry(studio, now);
  return days !== null && days > 0 && days <= 5;
}

export function formatVND(amount: number): string {
  return `${Math.round(amount).toLocaleString("vi-VN")}đ`;
}

export function formatVNDate(value?: string | Date | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatVNDateTime(value?: string | Date | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
