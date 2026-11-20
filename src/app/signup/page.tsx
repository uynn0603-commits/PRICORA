"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthHero } from "@/components/auth/AuthHero";
import { useGuestGuard } from "@/components/auth/useGuestGuard";
import { TextField } from "@/components/ui/fields";
import { LogoLockup } from "@/components/ui/Logo";
import { cn, formatBytes, slugify } from "@/lib/format";
import { toast } from "@/lib/overlay";
import { getPlanById } from "@/lib/plans";
import { registerStudio } from "@/lib/store";
import { ui } from "@/lib/ui";
import { useTitle } from "@/lib/use-store";

export default function SignupPage() {
  useTitle("Đăng ký studio · PICORA");
  const redirecting = useGuestGuard();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [studioName, setStudioName] = useState("");
  const [studioSlug, setStudioSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (redirecting) return null;
  const free = getPlanById("free");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    const result = await registerStudio({
      name: String(data.get("ownerName") || ""),
      email: String(data.get("email") || ""),
      password: String(data.get("password") || ""),
      studioName: String(data.get("studioName") || ""),
      studioSlug: String(data.get("studioSlug") || ""),
    });
    setBusy(false);
    if (!result.ok) {
      setErrors(result.errors);
      const first = Object.keys(result.errors)[0];
      if (first) formRef.current?.querySelector<HTMLElement>(`#${first}`)?.focus();
      return;
    }
    toast(`Chào mừng ${result.studioName} đến với PICORA`);
    router.push("/admin");
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <AuthHero title="Mở studio của bạn trên PICORA trong một phút." />
      <section className="flex min-h-screen items-center justify-center px-5 py-12">
        <div className="w-full max-w-[440px]">
          <div className="lg:hidden">
            <LogoLockup size={36} />
          </div>
          <h1 className="mt-8 text-[32px] font-semibold tracking-tight lg:mt-0">Tạo studio mới</h1>
          <p className="mt-2 text-sm text-mist">
            Bắt đầu với gói Miễn phí: {formatBytes(free.storage)} lưu trữ, {free.albums} album, {free.members} thành viên. Không cần thẻ thanh toán.
          </p>
          <form ref={formRef} id="signup-form" className="mt-8 space-y-4" noValidate onSubmit={submit}>
            <TextField
              id="studioName"
              label="Tên studio"
              required
              placeholder="Ví dụ: Nắng Studio"
              value={studioName}
              error={errors.studioName}
              onChange={(event) => {
                setStudioName(event.target.value);
                if (!slugEdited) setStudioSlug(slugify(event.target.value));
              }}
            />
            <label className="block" htmlFor="studioSlug">
              <span className={ui.label}>
                Địa chỉ studio <span className="text-primary">*</span>
              </span>
              <span className="flex items-center overflow-hidden rounded-xl border border-line bg-white focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                <span className="shrink-0 border-r border-line bg-canvas px-3 py-2.5 text-sm text-mist">picora.vn/s/</span>
                <input
                  id="studioSlug"
                  name="studioSlug"
                  className={cn("h-11 min-w-0 flex-1 px-3 text-sm outline-none", errors.studioSlug && "border-rose-400")}
                  aria-invalid={errors.studioSlug ? true : undefined}
                  placeholder="nang-studio"
                  value={studioSlug}
                  onChange={(event) => {
                    setSlugEdited(true);
                    setStudioSlug(event.target.value);
                  }}
                  onBlur={() => setStudioSlug(slugify(studioSlug))}
                />
              </span>
              <span className="mt-1.5 block text-xs text-mist">Khách hàng sẽ xem album tại địa chỉ này. Chỉ gồm chữ thường, số và dấu gạch ngang.</span>
              {errors.studioSlug && <span className="mt-1.5 text-xs font-medium text-rose-600">{errors.studioSlug}</span>}
            </label>
            <TextField id="ownerName" label="Họ và tên" required autoComplete="name" error={errors.ownerName} />
            <TextField id="email" label="Email" type="email" required autoComplete="email" error={errors.email} />
            <TextField
              id="password"
              label="Mật khẩu"
              type="password"
              required
              autoComplete="new-password"
              hint="Ít nhất 6 ký tự."
              error={errors.password}
            />
            <button type="submit" disabled={busy} className={`${ui.primary} h-11 w-full`}>
              {busy ? "Đang tạo studio..." : "Tạo studio"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-mist">
            Đã có tài khoản?{" "}
            <Link href="/login" className="font-semibold text-primary">
              Đăng nhập
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
