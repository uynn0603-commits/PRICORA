import { login, setSession } from "../data/store.js";
import { logoLockup } from "../components/logo.js";
import { openModal } from "../components/modal.js";
import { icon } from "../components/icons.js";
import { navigate } from "../utils/router.js";
import { ui } from "../utils/ui.js";
import { getSettings } from "../data/store.js";
import { esc } from "../utils/format.js";

const HERO = "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1800&q=80";

export const loginPage = {
  title() {
    return "Đăng nhập · PICORA";
  },
  render() {
    const slogan = getSettings().slogan;
    return `
      <div class="min-h-screen lg:grid lg:grid-cols-2">
        <section class="relative hidden min-h-screen lg:block">
          <img src="${HERO}" alt="" class="absolute inset-0 h-full w-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-ink/30"></div>
          <div class="relative flex h-full flex-col justify-between p-10 text-white">
            ${logoLockup({ tone: "dark", size: 40 })}
            <div class="max-w-md">
              <p class="text-4xl font-semibold leading-tight tracking-tight">Mỗi album, sẵn sàng cho những người trong ảnh.</p>
              <p class="mt-4 text-sm text-white/75">${esc(slogan)}</p>
            </div>
          </div>
        </section>
        <section class="relative flex min-h-screen items-center justify-center px-5 py-12">
          <div class="absolute inset-0 lg:hidden">
            <img src="${HERO}" alt="" class="h-full w-full object-cover opacity-25" />
            <div class="absolute inset-0 bg-white/82"></div>
          </div>
          <div class="relative w-full max-w-[420px]">
            <div class="lg:hidden">${logoLockup({ size: 36 })}</div>
            <h1 class="mt-8 text-[32px] font-semibold tracking-tight lg:mt-0">Chào mừng trở lại</h1>
            <p class="mt-2 text-sm text-mist">Đăng nhập vào thư viện của studio.</p>
            <form id="login-form" class="mt-8 space-y-4">
              <label class="block">
                <span class="${ui.label}">Email</span>
                <input id="email" name="email" type="email" autocomplete="username" required value="admin@view.vn" class="${ui.input}" />
              </label>
              <label class="block">
                <span class="${ui.label}">Mật khẩu</span>
                <span class="relative block">
                  <input id="password" name="password" type="password" autocomplete="current-password" required value="123456" class="${ui.input} pr-11" />
                  <button type="button" id="toggle-password" class="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-mist hover:text-ink" aria-label="Hiện mật khẩu">${icon("eye", "h-4 w-4")}</button>
                </span>
              </label>
              <div class="flex items-center justify-between gap-3 pt-1">
                <label class="flex items-center gap-2 text-sm text-ink">
                  <input id="remember" type="checkbox" class="h-4 w-4 accent-primary" checked />
                  Ghi nhớ đăng nhập
                </label>
                <button type="button" id="forgot" class="text-sm font-semibold text-primary">Quên mật khẩu</button>
              </div>
              <p id="login-error" class="hidden text-sm font-medium text-rose-600"></p>
              <button type="submit" class="${ui.primary} h-11 w-full">Đăng nhập</button>
            </form>
            <p class="mt-6 text-center text-xs text-mist">Tài khoản demo · admin@view.vn · 123456</p>
          </div>
        </section>
      </div>`;
  },
  mount() {
    const form = document.getElementById("login-form");
    const password = document.getElementById("password");
    const toggle = document.getElementById("toggle-password");
    const error = document.getElementById("login-error");
    toggle.addEventListener("click", () => {
      const show = password.type === "password";
      password.type = show ? "text" : "password";
      toggle.innerHTML = icon(show ? "eye-off" : "eye", "h-4 w-4");
      toggle.setAttribute("aria-label", show ? "Ẩn mật khẩu" : "Hiện mật khẩu");
    });
    document.getElementById("forgot").addEventListener("click", () => {
      openModal({
        title: "Đặt lại mật khẩu",
        body: "Bản prototype này không gửi email. Hãy đăng nhập bằng tài khoản demo <span class='font-semibold text-ink'>admin@view.vn</span> với mật khẩu <span class='font-semibold text-ink'>123456</span>.",
      });
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const email = String(data.get("email") || "");
      const pass = String(data.get("password") || "");
      if (!login(email, pass)) {
        error.textContent = "Email hoặc mật khẩu không đúng.";
        error.classList.remove("hidden");
        return;
      }
      setSession(document.getElementById("remember").checked);
      navigate("/admin");
    });
  },
};
