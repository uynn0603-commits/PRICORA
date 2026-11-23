"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthHero, HERO } from "@/components/auth/AuthHero";
import { useGuestGuard } from "@/components/auth/useGuestGuard";
import { Icon } from "@/components/ui/Icon";
import { LogoLockup } from "@/components/ui/Logo";
import { cn } from "@/lib/format";
import { openModal } from "@/lib/overlay";
import { login } from "@/lib/store";
import { ui } from "@/lib/ui";
import { useTitle } from "@/lib/use-store";

const DEMO_ACCOUNTS = [
  { email: "khoa@minhkhoa.studio", label: "Chủ studio · Minh Khoa Studio (gói Miễn phí)" },
  { email: "thuha@minhkhoa.studio", label: "Nhân viên · Minh Khoa Studio" },
  { email: "lan@lumiere.vn", label: "Chủ studio · Lumière Wedding (gói Pro)" },
  { email: "admin@picora.vn", label: "Quản trị nền tảng PICORA" },
];

// Shown only where demo data exists (ALLOW_DEMO_RESET), so production visitors never see it.
export default function LoginForm({ demo = false }: { demo?: boolean }) {
  useTitle("Đăng nhập · PICORA");
  const redirecting = useGuestGuard();
  const router = useRouter();
  const suspended = useSearchParams().get("suspended") === "1";
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState(demo ? DEMO_ACCOUNTS[0].email : "");
  const [password, setPassword] = useState(demo ? "123456" : "");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (redirecting) return null;

  const fillDemo = (value: string) => {
    setEmail(value);
    setPassword("123456");
    emailRef.current?.focus();
  };

  const forgot = () =>
    openModal({
      title: "Đặt lại mật khẩu",
      body: (
        <>
          Bản prototype này chưa gửi email. Hãy dùng một trong các tài khoản demo bên dưới form đăng nhập, mật khẩu đều là{" "}
          <span className="font-semibold text-ink">123456</span>.
        </>
      ),
    });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await login(email, password, remember);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    router.push(result.studioId ? "/admin" : "/platform");
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <AuthHero title="Nền tảng giao album ảnh cho mọi studio." />
      <section className="relative flex min-h-screen items-center justify-center px-5 py-12">
        <div className="absolute inset-0 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HERO} alt="" className="h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-white/82"></div>
        </div>
        <div className="relative w-full max-w-[420px]">
          <div className="lg:hidden">
            <LogoLockup size={36} />
          </div>
          <h1 className="mt-8 text-[32px] font-semibold tracking-tight lg:mt-0">Chào mừng trở lại</h1>
          <p className="mt-2 text-sm text-mist">Đăng nhập vào studio của bạn.</p>
          {suspended && (
            <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Studio của bạn đang bị tạm khóa. Vui lòng liên hệ PICORA để được hỗ trợ.
            </p>
          )}
          <form id="login-form" className="mt-8 space-y-4" onSubmit={submit}>
            <label className="block">
              <span className={ui.label}>Email</span>
              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={ui.input}
              />
            </label>
            <label className="block">
              <span className={ui.label}>Mật khẩu</span>
              <span className="relative block">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`${ui.input} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-mist hover:text-ink"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  <Icon name={showPassword ? "eye-off" : "eye"} className="h-4 w-4" />
                </button>
              </span>
            </label>
            <div className="flex items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" className="h-4 w-4 accent-primary" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                Ghi nhớ đăng nhập
              </label>
              <button type="button" onClick={forgot} className="text-sm font-semibold text-primary">
                Quên mật khẩu
              </button>
            </div>
            <p className={cn("text-sm font-medium text-rose-600", !error && "hidden")}>{error}</p>
            <button type="submit" disabled={busy} className={`${ui.primary} h-11 w-full`}>
              {busy ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-mist">
            Chưa có studio?{" "}
            <Link href="/signup" className="font-semibold text-primary">
              Đăng ký miễn phí
            </Link>
          </p>
          {demo && (
            <div className="mt-8 rounded-2xl border border-line bg-white/80 p-4">
              <p className="text-xs font-semibold text-ink">Tài khoản demo · mật khẩu 123456</p>
              <ul className="mt-2 space-y-1">
                {DEMO_ACCOUNTS.map((account) => (
                  <li key={account.email}>
                    <button
                      type="button"
                      onClick={() => fillDemo(account.email)}
                      className="w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-canvas"
                    >
                      <span className="block font-semibold text-ink">{account.email}</span>
                      <span className="block text-mist">{account.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
