import { showErrors, textField } from "../components/fields.js";
import { logoLockup } from "../components/logo.js";
import { toast } from "../components/toast.js";
import { registerStudio, setSession } from "../data/store.js";
import { getPlanById } from "../data/plans.js";
import { formatBytes, slugify } from "../utils/format.js";
import { navigate } from "../utils/router.js";
import { ui } from "../utils/ui.js";
import { authHero } from "./login.js";

export const signupPage = {
  title() {
    return "Đăng ký studio · PICORA";
  },
  render() {
    const free = getPlanById("free");
    return `
      <div class="min-h-screen lg:grid lg:grid-cols-2">
        ${authHero("Mở studio của bạn trên PICORA trong một phút.")}
        <section class="flex min-h-screen items-center justify-center px-5 py-12">
          <div class="w-full max-w-[440px]">
            <div class="lg:hidden">${logoLockup({ size: 36 })}</div>
            <h1 class="mt-8 text-[32px] font-semibold tracking-tight lg:mt-0">Tạo studio mới</h1>
            <p class="mt-2 text-sm text-mist">Bắt đầu với gói Miễn phí: ${formatBytes(free.storage)} lưu trữ, ${free.albums} album, ${free.members} thành viên. Không cần thẻ thanh toán.</p>
            <form id="signup-form" class="mt-8 space-y-4" novalidate>
              ${textField({ id: "studioName", label: "Tên studio", required: true, placeholder: "Ví dụ: Nắng Studio" })}
              <label class="block" for="studioSlug">
                <span class="${ui.label}">Địa chỉ studio <span class="text-primary">*</span></span>
                <span class="flex items-center overflow-hidden rounded-xl border border-line bg-white focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                  <span class="shrink-0 border-r border-line bg-canvas px-3 py-2.5 text-sm text-mist">picora.vn/s/</span>
                  <input id="studioSlug" name="studioSlug" class="h-11 min-w-0 flex-1 px-3 text-sm outline-none" placeholder="nang-studio" />
                </span>
                <span class="mt-1.5 block text-xs text-mist">Khách hàng sẽ xem album tại địa chỉ này. Chỉ gồm chữ thường, số và dấu gạch ngang.</span>
                <span data-error="studioSlug" class="mt-1.5 hidden text-xs font-medium text-rose-600"></span>
              </label>
              ${textField({ id: "ownerName", label: "Họ và tên", required: true, autocomplete: "name" })}
              ${textField({ id: "email", label: "Email", type: "email", required: true, autocomplete: "email" })}
              ${textField({ id: "password", label: "Mật khẩu", type: "password", required: true, autocomplete: "new-password", hint: "Ít nhất 6 ký tự." })}
              <button type="submit" class="${ui.primary} h-11 w-full">Tạo studio</button>
            </form>
            <p class="mt-6 text-center text-sm text-mist">Đã có tài khoản? <a data-link href="/login" class="font-semibold text-primary">Đăng nhập</a></p>
          </div>
        </section>
      </div>`;
  },
  mount() {
    const form = document.getElementById("signup-form");
    const name = document.getElementById("studioName");
    const slug = document.getElementById("studioSlug");
    let slugEdited = false;
    name.addEventListener("input", () => {
      if (!slugEdited) slug.value = slugify(name.value);
    });
    slug.addEventListener("input", () => {
      slugEdited = true;
    });
    slug.addEventListener("blur", () => {
      slug.value = slugify(slug.value);
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const result = registerStudio({
        name: String(data.get("ownerName") || ""),
        email: String(data.get("email") || ""),
        password: String(data.get("password") || ""),
        studioName: String(data.get("studioName") || ""),
        studioSlug: String(data.get("studioSlug") || ""),
      });
      if (!result.ok) {
        showErrors(form, result.errors);
        return;
      }
      setSession({ userId: result.user.id, studioId: result.studio.id }, true);
      toast(`Chào mừng ${result.studio.name} đến với PICORA`);
      navigate("/admin");
    });
  },
};
