"use client";

import { useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { cn } from "@/lib/format";
import { toast } from "@/lib/overlay";
import { changeAvatar, currentUser, removeAvatar, updateAccount } from "@/lib/store";
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
      <AvatarPicker />
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

// Saves on its own as soon as a photo is picked; it does not wait for "Lưu tài khoản".
function AvatarPicker() {
  const user = currentUser();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"" | "upload" | "remove">("");

  const pick = async (file: File | undefined) => {
    if (input.current) input.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Vui lòng chọn một tệp ảnh.", "error");
    setBusy("upload");
    const result = await changeAvatar(file);
    setBusy("");
    if (!result.ok) return toast(result.error, "error");
    toast("Đã đổi ảnh đại diện");
  };

  const remove = async () => {
    setBusy("remove");
    const result = await removeAvatar();
    setBusy("");
    if (!result.ok) return toast(result.error, "error");
    toast("Đã gỡ ảnh đại diện");
  };

  return (
    <div className="flex items-center gap-4 border-b border-line pb-5">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={Boolean(busy)}
        className="relative shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label="Đổi ảnh đại diện"
      >
        <UserAvatar user={user} className={cn("h-20 w-20 text-xl", busy && "opacity-50")} />
        <span className="absolute -bottom-0.5 -right-0.5 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-ink text-white">
          <Icon name={busy === "upload" ? "loader" : "camera"} className={cn("h-3.5 w-3.5", busy === "upload" && "animate-spin")} />
        </span>
      </button>
      <div className="min-w-0">
        <p className="text-sm font-semibold">Ảnh đại diện</p>
        <p className="mt-0.5 text-xs text-mist">Ảnh được cắt vuông, ảnh dọc giữ phần phía trên. Đổi xong là lưu ngay.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => input.current?.click()} disabled={Boolean(busy)} className={cn(ui.secondary, "h-9 px-3 text-xs")}>
            {busy === "upload" ? "Đang tải lên…" : user?.avatarUrl ? "Đổi ảnh" : "Tải ảnh lên"}
          </button>
          {user?.avatarUrl ? (
            <button type="button" onClick={remove} disabled={Boolean(busy)} className={cn(ui.ghost, "h-9 px-3 text-xs")}>
              {busy === "remove" ? "Đang gỡ…" : "Gỡ ảnh"}
            </button>
          ) : null}
        </div>
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => pick(event.target.files?.[0])} />
    </div>
  );
}
