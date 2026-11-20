"use client";

import { type FormEvent } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { formatDate } from "@/lib/format";
import { confirmDialog, toast } from "@/lib/overlay";
import { addMember, currentUser, getMembers, getPlan, removeMember, ROLES, setMemberRole } from "@/lib/store";
import { ui } from "@/lib/ui";
import type { Reload } from "./types";

export function MembersTab({ reload }: { reload: Reload }) {
  const list = getMembers();
  const plan = getPlan();
  const me = currentUser();
  const full = list.length >= plan.members;

  const changeRole = async (userId: string, role: string) => {
    const result = await setMemberRole(userId, role);
    if (!result.ok) toast(result.error, "error");
    else toast("Đã cập nhật vai trò");
    reload("members");
  };

  const remove = async (userId: string, name: string) => {
    const ok = await confirmDialog({
      title: `Xóa ${name} khỏi studio?`,
      message: "Người này sẽ không đăng nhập vào studio được nữa. Album và ảnh của studio vẫn giữ nguyên.",
      confirmText: "Xóa thành viên",
      danger: true,
    });
    if (!ok) return;
    const result = await removeMember(userId);
    if (!result.ok) return toast(result.error, "error");
    toast("Đã xóa thành viên");
    reload("members");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await addMember({
      name: String(data.get("memberName") || ""),
      email: String(data.get("memberEmail") || ""),
      role: String(data.get("memberRole") || ""),
      password: String(data.get("memberPassword") || ""),
    });
    if (!result.ok) return toast(result.error, "error");
    toast(result.existing ? `Đã thêm ${result.name} (tài khoản có sẵn)` : `Đã thêm ${result.name}`);
    reload("members");
  };

  return (
    <div className="grid max-w-4xl gap-4 lg:grid-cols-5">
      <section className={`${ui.card} overflow-hidden lg:col-span-3`}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-semibold">Thành viên studio</h2>
          <span className="text-sm text-mist">
            {list.length} / {plan.members}
          </span>
        </div>
        <ul className="divide-y divide-line">
          {list.map((member) => {
            const self = member.user.id === me?.id;
            return (
              <li key={member.user.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <UserAvatar user={member.user} tone="soft" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {member.user.name}
                    {self ? (
                      <>
                        {" "}
                        <span className="font-normal text-mist">(bạn)</span>
                      </>
                    ) : null}
                  </span>
                  <span className="block truncate text-xs text-mist">
                    {member.user.email} · tham gia {formatDate(member.createdAt)}
                  </span>
                </span>
                <span className="relative">
                  <select
                    value={member.role}
                    onChange={(event) => changeRole(member.user.id, event.target.value)}
                    className="h-9 appearance-none rounded-lg border border-line bg-white pl-3 pr-8 text-sm"
                    disabled={self}
                  >
                    {Object.entries(ROLES).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-mist">
                    <Icon name="chevron-down" className="h-3.5 w-3.5" />
                  </span>
                </span>
                {self ? (
                  <span className="w-9"></span>
                ) : (
                  <button
                    type="button"
                    onClick={() => remove(member.user.id, member.user.name)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-mist hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Xóa ${member.user.name}`}
                  >
                    <Icon name="trash-2" className="h-4 w-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="border-t border-line px-5 py-3 text-xs leading-relaxed text-mist">
          Chủ studio quản lý thương hiệu, thành viên và gói dịch vụ. Nhân viên quản lý album, ảnh và liên kết chia sẻ.
        </p>
      </section>
      <form id="member-form" className={`${ui.card} space-y-3 p-5 lg:col-span-2`} noValidate onSubmit={submit}>
        <h2 className="font-semibold">Thêm thành viên</h2>
        {full ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-950">
            Gói {plan.name} cho phép tối đa {plan.members} thành viên.{" "}
            <Link href="/admin/settings?tab=plan" className="font-semibold underline">
              Nâng cấp gói
            </Link>
          </p>
        ) : null}
        <label className="block">
          <span className={ui.label}>Họ và tên</span>
          <input id="memberName" name="memberName" className={ui.input} />
        </label>
        <label className="block">
          <span className={ui.label}>Email</span>
          <input id="memberEmail" name="memberEmail" type="email" className={ui.input} />
        </label>
        <label className="block">
          <span className={ui.label}>Vai trò</span>
          <span className="relative block">
            <select id="memberRole" name="memberRole" className={`${ui.input} appearance-none pr-10`} defaultValue="staff">
              <option value="staff">{ROLES.staff}</option>
              <option value="owner">{ROLES.owner}</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mist">
              <Icon name="chevron-down" className="h-4 w-4" />
            </span>
          </span>
        </label>
        <label className="block">
          <span className={ui.label}>Mật khẩu tạm</span>
          <input id="memberPassword" name="memberPassword" type="text" className={ui.input} placeholder="Ít nhất 6 ký tự" />
          <span className="mt-1.5 block text-xs text-mist">
            Bản demo chưa gửi email mời. Hãy gửi mật khẩu này cho thành viên. Nếu email đã có tài khoản PICORA, người đó dùng mật khẩu hiện tại.
          </span>
        </label>
        <button type="submit" className={`${ui.primary} w-full`} disabled={full}>
          <Icon name="plus" className="h-4 w-4" /> Thêm vào studio
        </button>
      </form>
    </div>
  );
}
