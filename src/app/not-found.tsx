"use client";

import Link from "next/link";
import { LogoLockup } from "@/components/ui/Logo";
import { useTitle } from "@/lib/use-store";
import { ui } from "@/lib/ui";

export default function NotFound() {
  useTitle("Không tìm thấy trang · PICORA");
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="px-6 py-5">
        <LogoLockup size={32} />
      </header>
      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="max-w-md text-center">
          <p className="text-sm font-semibold text-primary">Trang không khả dụng</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Trang này không thuộc PICORA.</h1>
          <p className="mt-4 text-sm leading-relaxed text-mist">Địa chỉ này không khớp với màn hình quản lý hay album nào của khách hàng.</p>
          <Link href="/login" className={`${ui.primary} mt-6`}>
            Về trang đăng nhập
          </Link>
        </div>
      </main>
    </div>
  );
}
