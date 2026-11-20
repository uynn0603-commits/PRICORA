"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/format";
import { toast } from "@/lib/overlay";
import { currentUser, updateAccount } from "@/lib/store";
import { ui } from "@/lib/ui";
import type { Reload } from "./types";

export function AccountTab({ reload }: { reload: Reload }) {
  const user = currentUser();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  if (!user) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    setError("");
    if (!cleanName) return setError("Vui lòng nhập họ và tên.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return setError("Vui lòng nhập email hợp lệ.");
    if (newPassword || confirmPassword || currentPassword) {
      if (newPassword.length < 6) return setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      if (newPassword !== confirmPassword) return setError("Mật khẩu xác nhận không khớp.");
    }
    const result = await updateAccount({ name: cleanName, email: cleanEmail, currentPassword, newPassword: newPassword || "" });
    if (!result.ok && result.error === "email") return setError("Email này đã được tài khoản khác sử dụng.");
    if (!result.ok && result.error === "current") return setError("Mật khẩu hiện tại không đúng.");
    if (!result.ok) return setError(result.error);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast("Đã cập nhật tài khoản");
    reload("account");
  };

  return (
    <form id="account-form" className={`${ui.card} max-w-2xl space-y-4 p-5 sm:p-6`} onSubmit={submit}>
      <label className="block">
        <span className={ui.label}>Họ và tên</span>
        <input id="accountName" value={name} onChange={(event) => setName(event.target.value)} className={ui.input} />
      </label>
      <label className="block">
        <span className={ui.label}>Email</span>
        <input id="accountEmail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={ui.input} />
      </label>
      <div className="border-t border-line pt-4">
        <p className="text-sm font-semibold">Đổi mật khẩu</p>
        <p className="mt-1 text-xs text-mist">Để trống mật khẩu mới nếu bạn chỉ muốn cập nhật tên hoặc email.</p>
      </div>
      <label className="block">
        <span className={ui.label}>Mật khẩu hiện tại</span>
        <input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          className={ui.input}
        />
      </label>
      <label className="block">
        <span className={ui.label}>Mật khẩu mới</span>
        <input id="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={ui.input} />
      </label>
      <label className="block">
        <span className={ui.label}>Xác nhận mật khẩu mới</span>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={ui.input}
        />
      </label>
      <p className={cn("text-sm font-medium text-rose-600", !error && "hidden")}>{error}</p>
      <div className="flex justify-end">
        <button type="submit" className={ui.primary}>
          Lưu tài khoản
        </button>
      </div>
    </form>
  );
}
