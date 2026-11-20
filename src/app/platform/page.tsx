"use client";

import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { LogoLockup, StudioMark } from "@/components/ui/Logo";
import { cn, formatBytes, formatDate, slugify } from "@/lib/format";
import { closeModal, confirmDialog, openModal, toast } from "@/lib/overlay";
import { formatPrice, PLANS } from "@/lib/plans";
import {
  clearSession,
  createStudio,
  getSession,
  listStudios,
  loadPlatform,
  platformLoaded,
  setStudioPlan,
  setStudioStatus,
} from "@/lib/store";
import type { StudioStatus } from "@/lib/types";
import { ui } from "@/lib/ui";
import { useStore, useTitle } from "@/lib/use-store";

const STATUS: Record<StudioStatus, { label: string; className: string }> = {
  active: { label: "Hoạt động", className: "bg-emerald-50 text-emerald-700" },
  suspended: { label: "Tạm khóa", className: "bg-rose-50 text-rose-700" },
};

function Stat({ label, value, icon }: { label: string; value: ReactNode; icon: string }) {
  return (
    <article className={`${ui.card} p-5`}>
      <div className="flex items-center justify-between text-mist">
        <span className="text-sm">{label}</span>
        <Icon name={icon} className="h-4 w-4" />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
    </article>
  );
}

function UsageCell({ used, limit }: { used: number; limit: number }) {
  const ratio = Math.min(1, used / limit);
  const tone = ratio >= 0.95 ? "bg-rose-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-primary";
  return (
    <>
      <span className="block text-sm">
        {formatBytes(used)} <span className="text-mist">/ {formatBytes(limit)}</span>
      </span>
      <span className="mt-1.5 block h-1.5 w-28 overflow-hidden rounded-full bg-line">
        <span className={`block h-full rounded-full ${tone}`} style={{ width: `${Math.max(2, Math.round(ratio * 100))}%` }}></span>
      </span>
    </>
  );
}

/* ---------- Create studio modal ---------- */

type FieldId = "studioName" | "studioSlug" | "ownerEmail" | "ownerName" | "ownerPassword";
type CreateValues = Record<FieldId | "planId", string>;

// The modal's primary action lives outside the form, so the mounted form exposes its submit here.
const createForm: { submit: (() => void) | null } = { submit: null };

function Field({
  id,
  label,
  value,
  error,
  onChange,
  onBlur,
  type = "text",
  placeholder = "",
  hint = "",
  prefix = "",
  autoFocus,
}: {
  id: FieldId;
  label: string;
  value: string;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  prefix?: string;
  autoFocus?: boolean;
}) {
  const input = (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      autoFocus={autoFocus}
      className={prefix ? "h-11 min-w-0 flex-1 px-3 text-sm text-ink outline-none" : ui.input}
    />
  );
  return (
    <label className="block">
      <span className={ui.label}>{label}</span>
      {prefix ? (
        <span className="flex items-center overflow-hidden rounded-xl border border-line bg-white focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
          <span className="shrink-0 border-r border-line bg-canvas px-3 py-2.5 text-sm text-mist">{prefix}</span>
          {input}
        </span>
      ) : (
        input
      )}
      {hint ? <span className="mt-1 block text-xs text-mist">{hint}</span> : null}
      {error ? <span className="mt-1 text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

function CreateStudioForm() {
  const [values, setValues] = useState<CreateValues>({
    studioName: "",
    studioSlug: "",
    planId: PLANS[0].id,
    ownerEmail: "",
    ownerName: "",
    ownerPassword: "",
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    createForm.submit = async () => {
      const result = await createStudio(values);
      setErrors(result.ok ? {} : result.errors);
      if (!result.ok) return;
      closeModal();
      toast(
        result.existing
          ? `Đã tạo ${result.studio.name}. ${result.owner.name} là chủ studio.`
          : `Đã tạo ${result.studio.name} và tài khoản ${result.owner.email}.`,
      );
    };
    return () => {
      createForm.submit = null;
    };
  }, [values]);

  const change = (id: FieldId) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setErrors((current) => ({ ...current, [id]: "" }));
    setValues((current) => {
      const next = { ...current, [id]: value };
      if (id === "studioName" && !slugTouched) next.studioSlug = slugify(value);
      return next;
    });
    if (id === "studioSlug") setSlugTouched(true);
  };

  return (
    <form
      id="create-studio-form"
      className="space-y-3 text-left"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        createForm.submit?.();
      }}
    >
      <Field id="studioName" label="Tên studio" placeholder="Ví dụ: Nắng Studio" value={values.studioName} error={errors.studioName} onChange={change("studioName")} autoFocus />
      <Field
        id="studioSlug"
        label="Địa chỉ studio"
        placeholder="nang-studio"
        prefix="picora.vn/s/"
        value={values.studioSlug}
        error={errors.studioSlug}
        onChange={change("studioSlug")}
        onBlur={() => setValues((current) => ({ ...current, studioSlug: slugify(current.studioSlug) }))}
      />
      <label className="block">
        <span className={ui.label}>Gói dịch vụ</span>
        <span className="relative block">
          <select
            id="planId"
            className={`${ui.input} appearance-none pr-10`}
            value={values.planId}
            onChange={(event) => setValues((current) => ({ ...current, planId: event.target.value }))}
          >
            {PLANS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.price ? ` · ${formatPrice(item.price)}` : ""}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mist">
            <Icon name="chevron-down" className="h-4 w-4" />
          </span>
        </span>
      </label>
      <div className="border-t border-line pt-3">
        <p className="text-sm font-semibold text-ink">Chủ studio</p>
        <p className="mt-0.5 text-xs">Nếu email đã có tài khoản PICORA, người đó dùng mật khẩu hiện tại và không cần nhập tên, mật khẩu.</p>
      </div>
      <Field id="ownerEmail" label="Email" type="email" value={values.ownerEmail} error={errors.ownerEmail} onChange={change("ownerEmail")} />
      <Field id="ownerName" label="Họ và tên" value={values.ownerName} error={errors.ownerName} onChange={change("ownerName")} />
      <Field
        id="ownerPassword"
        label="Mật khẩu tạm"
        placeholder="Ít nhất 6 ký tự"
        hint="Bản demo chưa gửi email. Hãy gửi mật khẩu này cho chủ studio."
        value={values.ownerPassword}
        error={errors.ownerPassword}
        onChange={change("ownerPassword")}
      />
    </form>
  );
}

function openCreateStudio() {
  openModal({
    title: "Tạo studio mới",
    body: <CreateStudioForm />,
    actions: [{ label: "Hủy" }, { label: "Tạo studio", kind: "primary", close: false, onClick: () => createForm.submit?.() }],
  });
}

/* ---------- Page ---------- */

export default function PlatformPage() {
  useStore();
  useTitle("Quản trị nền tảng · PICORA");
  const router = useRouter();
  const session = getSession();
  const blocked = !session ? "/login" : !session.user.platformAdmin ? "/admin" : null;

  useEffect(() => {
    if (blocked) router.replace(blocked);
    else void loadPlatform();
  }, [blocked, router]);

  if (blocked || !session || !platformLoaded()) return null;

  const rows = listStudios();
  const active = rows.filter((row) => row.studio.status === "active");
  const revenue = active.reduce((sum, row) => sum + row.plan.price, 0);
  const albums = rows.reduce((sum, row) => sum + row.usage.albums, 0);
  const storage = rows.reduce((sum, row) => sum + row.usage.storage, 0);

  const logout = () => {
    clearSession();
    router.replace("/login");
  };

  const changePlan = async (studioId: string, planId: string) => {
    const result = await setStudioPlan(studioId, planId);
    if (!result.ok) return toast(result.error || "Không thể đổi gói.", "error");
    toast(result.warning ? `Đã đổi gói. Lưu ý: ${result.warning}` : "Đã đổi gói dịch vụ", result.warning ? "error" : undefined);
  };

  const changeStatus = async (studioId: string, name: string, next: StudioStatus) => {
    const suspend = next === "suspended";
    if (suspend) {
      const ok = await confirmDialog({
        title: `Tạm khóa ${name}?`,
        message: "Thành viên studio sẽ không đăng nhập được và mọi album của studio sẽ tạm ẩn với khách. Dữ liệu vẫn được giữ nguyên.",
        confirmText: "Tạm khóa studio",
        danger: true,
      });
      if (!ok) return;
    }
    const result = await setStudioStatus(studioId, next);
    if (!result.ok) return toast(result.error || "Không thể đổi trạng thái.", "error");
    toast(suspend ? "Đã tạm khóa studio" : "Studio đã hoạt động trở lại");
  };

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-3">
            <LogoLockup size={30} />
            <span className="hidden rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white sm:inline">Quản trị nền tảng</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-semibold">{session.name}</span>
              <span className="block text-xs text-mist">{session.email}</span>
            </span>
            <button type="button" onClick={logout} className={ui.secondary}>
              <Icon name="log-out" className="h-4 w-4" /> Đăng xuất
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight md:text-[32px]">Studio trên PICORA</h1>
            <p className="mt-1 text-sm text-mist">Theo dõi gói dịch vụ, dung lượng và trạng thái của từng studio.</p>
          </div>
          <button type="button" onClick={openCreateStudio} className={ui.primary}>
            <Icon name="plus" className="h-4 w-4" /> Tạo studio
          </button>
        </div>
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Studio"
            icon="building-2"
            value={
              <>
                {rows.length} <span className="text-sm font-normal text-mist">· {active.length} hoạt động</span>
              </>
            }
          />
          <Stat label="Album" icon="images" value={albums.toLocaleString("vi-VN")} />
          <Stat label="Dung lượng đã dùng" icon="hard-drive" value={formatBytes(storage)} />
          <Stat label="Doanh thu dự kiến" icon="credit-card" value={formatPrice(revenue)} />
        </section>
        <section className={`${ui.card} mt-6 overflow-x-auto`}>
          <table className="w-full min-w-[920px] text-left">
            <thead className="border-b border-line text-xs font-semibold uppercase tracking-wider text-mist">
              <tr>
                <th className="px-5 py-3">Studio</th>
                <th className="px-5 py-3">Chủ studio</th>
                <th className="px-5 py-3">Gói</th>
                <th className="px-5 py-3">Album</th>
                <th className="px-5 py-3">Dung lượng</th>
                <th className="px-5 py-3">Thành viên</th>
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ studio, plan, usage, owner }) => {
                const status = STATUS[studio.status] || STATUS.active;
                const suspended = studio.status === "suspended";
                return (
                  <tr key={studio.id} className={suspended ? "bg-canvas/60" : ""}>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-3">
                        <StudioMark studio={studio} size={36} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{studio.name}</span>
                          <span className="block truncate text-xs text-mist">
                            /s/{studio.slug} · tạo {formatDate(studio.createdAt)}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {owner ? (
                        <>
                          <span className="block font-medium">{owner.name}</span>
                          <span className="block text-xs text-mist">{owner.email}</span>
                        </>
                      ) : (
                        <span className="text-mist">Chưa có</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="relative block w-36">
                        <select
                          value={plan.id}
                          onChange={(event) => changePlan(studio.id, event.target.value)}
                          className="h-9 w-full appearance-none rounded-lg border border-line bg-white pl-3 pr-8 text-sm"
                        >
                          {PLANS.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-mist">
                          <Icon name="chevron-down" className="h-3.5 w-3.5" />
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {usage.albums}
                      {plan.albums == null ? null : <span className="text-mist"> / {plan.albums}</span>}
                    </td>
                    <td className="px-5 py-4">
                      <UsageCell used={usage.storage} limit={plan.storage} />
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {usage.members}
                      <span className="text-mist"> / {plan.members}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => changeStatus(studio.id, studio.name, suspended ? "active" : "suspended")}
                        className={cn(ui.ghost, !suspended && "hover:text-rose-600")}
                      >
                        <Icon name={suspended ? "circle-check" : "ban"} className="h-4 w-4" /> {suspended ? "Mở lại" : "Tạm khóa"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        <p className="mt-4 text-xs text-mist">Doanh thu dự kiến tính theo giá gói của các studio đang hoạt động. Bản demo chưa tích hợp thanh toán.</p>
      </main>
    </div>
  );
}
