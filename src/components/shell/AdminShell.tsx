"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatVNDate, isPlanExpired } from "@/lib/billing";
import { clearSession, currentStudio, getPendingPayment, getPlan, getSession, isOwner, studiosForUser, switchStudio } from "@/lib/store";
import { openMenu, toast, type MenuItem } from "@/lib/overlay";
import { useStore } from "@/lib/use-store";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

// Admin pages need a signed-in member of an active studio. Platform admins without a
// studio go to the platform console; members of a suspended studio are signed out.
export function AdminShell({ children }: { children: ReactNode }) {
  useStore();
  const router = useRouter();
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const session = getSession();
  const studio = currentStudio();
  const blocked = !session ? "/login" : !session.studioId ? "/platform" : studio?.status !== "active" ? "suspended" : null;

  useEffect(() => {
    if (blocked === "suspended") {
      clearSession();
      router.replace("/login?suspended=1");
    } else if (blocked) router.replace(blocked);
  }, [blocked, router]);

  useEffect(() => {
    if (!menuOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [menuOpen]);

  if (blocked || !session) return null;

  const plan = getPlan();
  const planExpired = isPlanExpired(studio);
  const pendingPayment = getPendingPayment();
  const owner = isOwner();

  const logout = () => {
    clearSession();
    toast("Đã đăng xuất");
    router.push("/login");
  };

  const onSwitchStudio = (anchor: Element) => {
    const items: MenuItem[] = studiosForUser(session.user.id)
      .filter((item) => item.studio.id !== session.studioId)
      .map((item) => ({
        label: item.studio.status === "active" ? item.studio.name : `${item.studio.name} (tạm khóa)`,
        icon: "building-2",
        onClick: () => {
          if (item.studio.status !== "active") {
            toast(`${item.studio.name} đang bị tạm khóa`, "error");
            return;
          }
          void switchStudio(item.studio.id).then((result) => {
            if (!result.ok) return toast(result.error, "error");
            toast(`Đã chuyển sang ${item.studio.name}`);
            router.push("/admin");
          });
        },
      }));
    if (session.user.platformAdmin) items.push({ label: "Quản trị nền tảng", icon: "shield-check", onClick: () => router.push("/platform") });
    if (items.length) openMenu(anchor, items);
  };

  const onAvatar = (anchor: Element) =>
    openMenu(anchor, [
      { label: session.name || "Tài khoản", icon: "user-round", onClick: () => router.push("/admin/settings?tab=account") },
      { label: "Cài đặt", icon: "settings", onClick: () => router.push("/admin/settings") },
      { label: "Đăng xuất", icon: "log-out", danger: true, onClick: logout },
    ]);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Sidebar path={path} open={menuOpen} onClose={() => setMenuOpen(false)} onSwitchStudio={onSwitchStudio} onLogout={logout} />
      <div className="lg:pl-[250px]">
        <Header path={path} onOpenMenu={() => setMenuOpen(true)} onAvatar={onAvatar} />
        {planExpired ? (
          <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 md:px-6 xl:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-rose-900">
              <div className="flex items-start gap-2.5">
                <Icon name={pendingPayment ? "clock" : "circle-alert"} className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <p>
                  <span className="font-semibold">
                    Gói {plan.name} đã hết hạn từ {formatVNDate(studio?.planExpiresAt)}.
                  </span>{" "}
                  {pendingPayment
                    ? "Yêu cầu gia hạn đang đợi quản trị viên xác nhận. Các thao tác tạo và sửa album đang tạm khóa; album đã giao cho khách vẫn xem bình thường."
                    : "Các thao tác tạo và sửa album đang tạm khóa cho tới khi gia hạn được duyệt; album đã giao cho khách vẫn xem bình thường."}
                </p>
              </div>
              {owner ? (
                <Link
                  href="/admin/settings?tab=plan"
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  <Icon name="qr-code" className="h-3.5 w-3.5" />
                  {pendingPayment ? "Xem trạng thái duyệt" : "Gia hạn ngay"}
                </Link>
              ) : (
                <span className="text-xs font-medium text-rose-700">Liên hệ chủ studio để gia hạn</span>
              )}
            </div>
          </div>
        ) : null}
        <main className="px-4 py-6 md:px-6 xl:px-8 xl:py-8">{children}</main>
      </div>
    </div>
  );
}
