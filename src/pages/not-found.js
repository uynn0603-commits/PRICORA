import { logoLockup } from "../components/logo.js";
import { ui } from "../utils/ui.js";

export const notFoundPage = {
  title() {
    return "Không tìm thấy trang · PICORA";
  },
  render() {
    return `
      <div class="flex min-h-screen flex-col bg-canvas">
        <header class="px-6 py-5">${logoLockup({ size: 32 })}</header>
        <main class="flex flex-1 items-center justify-center px-6 pb-16">
          <div class="max-w-md text-center">
            <p class="text-sm font-semibold text-primary">Trang không khả dụng</p>
            <h1 class="mt-3 text-4xl font-semibold tracking-tight">Trang này không thuộc PICORA.</h1>
            <p class="mt-4 text-sm leading-relaxed text-mist">Địa chỉ này không khớp với màn hình quản lý hay album nào của khách hàng.</p>
            <a data-link href="/login" class="${ui.primary} mt-6">Về trang đăng nhập</a>
          </div>
        </main>
      </div>`;
  },
  mount() {},
};
