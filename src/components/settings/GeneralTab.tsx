"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/format";
import { confirmDialog, toast } from "@/lib/overlay";
import { currentStudio, getSettings, resetDemo, updateSettings, updateStudio } from "@/lib/store";
import { ui } from "@/lib/ui";
import type { Reload } from "./types";

export function GeneralTab({ reload }: { reload: Reload }) {
  const router = useRouter();
  const studio = currentStudio();
  const settings = getSettings();
  const [name, setName] = useState(studio?.name || "");
  const [slug, setSlug] = useState(studio?.slug || "");
  const [days, setDays] = useState(String(settings.defaultExpirationDays));
  const [protect, setProtect] = useState(settings.defaultPasswordProtection);

  if (!studio) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    const expiration = Number(days);
    if (!cleanName) return toast("Vui lòng nhập tên studio.", "error");
    if (!Number.isFinite(expiration) || expiration < 1) return toast("Thời hạn phải từ 1 ngày trở lên.", "error");
    const nextSlug = slugify(slug);
    if (nextSlug !== currentStudio()?.slug) {
      const ok = await confirmDialog({
        title: "Đổi địa chỉ studio?",
        message: `Mọi liên kết album sẽ chuyển sang picora.vn/s/${nextSlug}/… Liên kết cũ đã gửi cho khách sẽ không còn mở được.`,
        confirmText: "Đổi địa chỉ",
      });
      if (!ok) return;
    }
    const result = await updateStudio({ name: cleanName, slug: nextSlug });
    if (!result.ok) return toast(result.error, "error");
    updateSettings({ defaultExpirationDays: expiration, defaultPasswordProtection: protect });
    toast("Đã lưu thông tin studio");
    reload("general");
  };

  const reset = async () => {
    const ok = await confirmDialog({
      title: "Khôi phục dữ liệu demo?",
      message: "Toàn bộ studio, tài khoản và album trên nền tảng sẽ trở về bộ mẫu ban đầu. Studio bạn tự đăng ký sẽ bị xóa.",
      confirmText: "Khôi phục dữ liệu",
      danger: true,
    });
    if (!ok) return;
    const result = await resetDemo();
    if (!result.ok) return toast(result.error, "error");
    toast("Đã khôi phục dữ liệu demo");
    router.replace("/admin");
  };

  return (
    <form id="general-form" className={`${ui.card} max-w-2xl space-y-4 p-5 sm:p-6`} onSubmit={submit}>
      <label className="block">
        <span className={ui.label}>Tên studio</span>
        <input id="studioName" value={name} onChange={(event) => setName(event.target.value)} className={ui.input} />
      </label>
      <label className="block">
        <span className={ui.label}>Địa chỉ studio</span>
        <span className="flex items-center overflow-hidden rounded-xl border border-line bg-white focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
          <span className="shrink-0 border-r border-line bg-canvas px-3 py-2.5 text-sm text-mist">picora.vn/s/</span>
          <input
            id="studioSlug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            onBlur={() => setSlug(slugify(slug))}
            className="h-11 min-w-0 flex-1 px-3 text-sm outline-none"
          />
        </span>
        <span className="mt-1.5 block text-xs text-mist">Đổi địa chỉ sẽ làm các liên kết album đã gửi cho khách không còn mở được.</span>
      </label>
      <label className="block">
        <span className={ui.label}>Thời hạn album mặc định</span>
        <span className="relative block">
          <input
            id="defaultExpirationDays"
            type="number"
            min="1"
            max="3650"
            value={days}
            onChange={(event) => setDays(event.target.value)}
            className={`${ui.input} pr-16`}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-mist">ngày</span>
        </span>
        <span className="mt-1.5 block text-xs text-mist">Áp dụng khi bạn tạo album mới.</span>
      </label>
      <label className="flex items-start gap-3 rounded-xl border border-line px-3 py-3">
        <input
          id="defaultPasswordProtection"
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-primary"
          checked={protect}
          onChange={(event) => setProtect(event.target.checked)}
        />
        <span>
          <span className="block text-sm font-semibold">Mặc định bảo vệ bằng mật khẩu</span>
          <span className="mt-1 block text-xs leading-relaxed text-mist">Album mới sẽ được tạo sẵn mật khẩu. Bạn có thể xóa trước khi xuất bản.</span>
        </span>
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button type="button" onClick={reset} className="text-sm font-semibold text-rose-600">
          Khôi phục dữ liệu demo
        </button>
        <button type="submit" className={ui.primary}>
          Lưu thông tin studio
        </button>
      </div>
    </form>
  );
}
