import { landingFor, login, setSession, studiosForUser } from "../data/store.js";
import { logoLockup } from "../components/logo.js";
import { openModal } from "../components/modal.js";
import { icon } from "../components/icons.js";
import { navigate } from "../utils/router.js";
import { ui } from "../utils/ui.js";
import { esc } from "../utils/format.js";

export const HERO = "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1800&q=80";
export const PLATFORM_SLOGAN = "Your Photos. Your Memories.";

const DEMO_ACCOUNTS = [
  { email: "khoa@minhkhoa.studio", label: "Chủ studio · Minh Khoa Studio (gói Miễn phí)" },
  { email: "thuha@minhkhoa.studio", label: "Nhân viên · Minh Khoa Studio" },
  { email: "lan@lumiere.vn", label: "Chủ studio · Lumière Wedding (gói Pro)" },
  { email: "admin@picora.vn", label: "Quản trị nền tảng PICORA" },
];

export function authHero(title) {
  return `
    <section class="relative hidden min-h-screen lg:block">
      <img src="${HERO}" alt="" class="absolute inset-0 h-full w-full object-cover" />
      <div class="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-ink/30"></div>
      <div class="relative flex h-full flex-col justify-between p-10 text-white">
        ${logoLockup({ tone: "dark", size: 40 })}
        <div class="max-w-md">
          <p class="text-4xl font-semibold leading-tight tracking-tight">${title}</p>
          <p class="mt-4 text-sm text-white/75">${esc(PLATFORM_SLOGAN)}</p>
        </div>
      </div>
    </section>`;
}

export const loginPage = {
  title() {
    return "Đăng nhập · PICORA";
  },
  render(route) {
    const suspended = route.query.suspended === "1";
    return `
      <div class="min-h-screen lg:grid lg:grid-cols-2">
        ${authHero("Nền tảng giao album ảnh cho mọi studio.")}
        <section class="relative flex min-h-screen items-center justify-center px-5 py-12">
          <div class="absolute inset-0 lg:hidden">
            <img src="${HERO}" alt="" class="h-full w-full object-cover opacity-25" />
            <div class="absolute inset-0 bg-white/82"></div>
          </div>
          <div class="relative w-full max-w-[420px]">
            <div class="lg:hidden">${logoLockup({ size: 36 })}</div>
            <h1 class="mt-8 text-[32px] font-semibold tracking-tight lg:mt-0">Chào mừng trở lại</h1>
            <p class="mt-2 text-sm text-mist">Đăng nhập vào studio của bạn.</p>
            ${
              suspended
                ? `<p class="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">Studio của bạn đang bị tạm khóa. Vui lòng liên hệ PICORA để được hỗ trợ.</p>`
                : ""
            }
            <form id="login-form" class="mt-8 space-y-4">
              <label class="block">
                <span class="${ui.label}">Email</span>
                <input id="email" name="email" type="email" autocomplete="username" required value="${DEMO_ACCOUNTS[0].email}" class="${ui.input}" />
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
            <p class="mt-6 text-center text-sm text-mist">Chưa có studio? <a data-link href="/signup" class="font-semibold text-primary">Đăng ký miễn phí</a></p>
            <div class="mt-8 rounded-2xl border border-line bg-white/80 p-4">
              <p class="text-xs font-semibold text-ink">Tài khoản demo · mật khẩu 123456</p>
              <ul class="mt-2 space-y-1">
                ${DEMO_ACCOUNTS.map(
                  (account) => `
                    <li><button type="button" data-demo="${account.email}" class="w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-canvas">
                      <span class="block font-semibold text-ink">${account.email}</span>
                      <span class="block text-mist">${account.label}</span>
                    </button></li>`,
                ).join("")}
              </ul>
            </div>
          </div>
        </section>
      </div>`;
  },
  mount() {
    const form = document.getElementById("login-form");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const toggle = document.getElementById("toggle-password");
    const error = document.getElementById("login-error");
    toggle.addEventListener("click", () => {
      const show = password.type === "password";
      password.type = show ? "text" : "password";
      toggle.innerHTML = icon(show ? "eye-off" : "eye", "h-4 w-4");
      toggle.setAttribute("aria-label", show ? "Ẩn mật khẩu" : "Hiện mật khẩu");
    });
    document.querySelectorAll("[data-demo]").forEach((button) =>
      button.addEventListener("click", () => {
        email.value = button.dataset.demo;
        password.value = "123456";
        email.focus();
      }),
    );
    document.getElementById("forgot").addEventListener("click", () => {
      openModal({
        title: "Đặt lại mật khẩu",
        body: "Bản prototype này chưa gửi email. Hãy dùng một trong các tài khoản demo bên dưới form đăng nhập, mật khẩu đều là <span class='font-semibold text-ink'>123456</span>.",
      });
    });
    const fail = (message) => {
      error.textContent = message;
      error.classList.remove("hidden");
    };
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const user = login(email.value, password.value);
      if (!user) return fail("Email hoặc mật khẩu không đúng.");
      const landing = landingFor(user);
      if (!landing) return fail("Tài khoản này chưa thuộc studio nào.");
      if (landing.suspended) {
        const name = studiosForUser(user.id)[0]?.studio.name || "Studio";
        return fail(`${name} đang bị tạm khóa. Vui lòng liên hệ PICORA.`);
      }
      setSession({ userId: user.id, studioId: landing.studioId }, document.getElementById("remember").checked);
      navigate(landing.studioId ? "/admin" : "/platform");
    });
  },
};
