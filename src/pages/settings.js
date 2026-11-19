import { confirmDialog } from "../components/dialog.js";
import { logoMark } from "../components/logo.js";
import { toast } from "../components/toast.js";
import { applyBrand, getSettings, resetDemo, updateAccount, updateSettings } from "../data/store.js";
import { esc, isHex } from "../utils/format.js";
import { onCleanup } from "../utils/lifecycle.js";
import { navigate } from "../utils/router.js";
import { readAsDataUrl } from "../data/media.js";
import { ui } from "../utils/ui.js";

const TABS = [
  { id: "general", label: "Chung" },
  { id: "branding", label: "Thương hiệu" },
  { id: "account", label: "Tài khoản" },
];

export const settingsPage = {
  title() {
    return "Cài đặt · PICORA";
  },
  render(route) {
    const tab = TABS.some((item) => item.id === route.query.tab) ? route.query.tab : "general";
    const settings = getSettings();
    return `
      <div class="mb-6">
        <h1 class="text-[28px] font-semibold tracking-tight md:text-[32px]">Cài đặt</h1>
        <p class="mt-1 text-sm text-mist">Thiết lập mặc định của studio, thương hiệu và tài khoản đăng nhập.</p>
      </div>
      <div class="mb-6 flex gap-5 border-b border-line">
        ${TABS.map(
          (item) => `
            <a data-link href="/admin/settings?tab=${item.id}" class="border-b-2 pb-3 text-sm font-semibold ${
              tab === item.id ? "border-primary text-ink" : "border-transparent text-mist"
            }">${item.label}</a>`,
        ).join("")}
      </div>
      ${tab === "general" ? general(settings) : ""}
      ${tab === "branding" ? branding(settings) : ""}
      ${tab === "account" ? account(settings) : ""}`;
  },
  mount(route) {
    const tab = route.query.tab || "general";
    if (tab === "general") mountGeneral();
    if (tab === "branding") mountBranding();
    if (tab === "account") mountAccount();
  },
};

function general(settings) {
  return `
    <form id="general-form" class="${ui.card} max-w-2xl space-y-4 p-5 sm:p-6">
      <label class="block">
        <span class="${ui.label}">Tên nền tảng</span>
        <input id="platformName" value="${esc(settings.platformName)}" class="${ui.input}" />
      </label>
      <label class="block">
        <span class="${ui.label}">Thời hạn album mặc định</span>
        <span class="relative block">
          <input id="defaultExpirationDays" type="number" min="1" max="3650" value="${esc(settings.defaultExpirationDays)}" class="${ui.input} pr-16" />
          <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-mist">ngày</span>
        </span>
        <span class="mt-1.5 block text-xs text-mist">Áp dụng khi bạn tạo album mới.</span>
      </label>
      <label class="flex items-start gap-3 rounded-xl border border-line px-3 py-3">
        <input id="defaultPasswordProtection" type="checkbox" class="mt-0.5 h-4 w-4 accent-primary" ${settings.defaultPasswordProtection ? "checked" : ""} />
        <span>
          <span class="block text-sm font-semibold">Mặc định bảo vệ bằng mật khẩu</span>
          <span class="mt-1 block text-xs leading-relaxed text-mist">Album mới sẽ được tạo sẵn mật khẩu. Bạn có thể xóa trước khi xuất bản.</span>
        </span>
      </label>
      <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button type="button" id="reset-demo" class="text-sm font-semibold text-rose-600">Khôi phục dữ liệu demo</button>
        <button type="submit" class="${ui.primary}">Lưu cài đặt chung</button>
      </div>
    </form>`;
}

function branding(settings) {
  return `
    <form id="brand-form" class="${ui.card} max-w-2xl space-y-5 p-5 sm:p-6">
      <div>
        <span class="${ui.label}">Logo</span>
        <div class="flex items-center gap-4">
          <span id="logo-preview" class="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-line bg-canvas">${settings.logoDataUrl ? `<img src="${settings.logoDataUrl}" alt="" class="h-full w-full object-cover" />` : logoMark(40)}</span>
          <label class="${ui.secondary} cursor-pointer">
            Tải biểu tượng lên
            <input id="logo-file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" class="sr-only" />
          </label>
        </div>
        <p class="mt-2 text-xs text-mist">Biểu tượng hình vuông hiển thị đẹp nhất. PNG, JPG, WEBP hoặc SVG dưới 800 KB.</p>
      </div>
      ${colorRow("Màu chính", "primaryColor", settings.primaryColor)}
      ${colorRow("Màu phụ", "secondaryColor", settings.secondaryColor)}
      <label class="block">
        <span class="${ui.label}">Khẩu hiệu</span>
        <input id="slogan" value="${esc(settings.slogan)}" class="${ui.input}" />
      </label>
      <div class="flex justify-end">
        <button type="submit" class="${ui.primary}">Lưu thương hiệu</button>
      </div>
    </form>`;
}

function colorRow(label, id, value) {
  return `
    <label class="block">
      <span class="${ui.label}">${label}</span>
      <span class="flex gap-2">
        <input data-color="${id}" type="color" value="${esc(value)}" class="h-11 w-14 cursor-pointer rounded-xl border border-line bg-white p-1" />
        <input data-hex="${id}" id="${id}" value="${esc(value)}" class="${ui.input}" />
      </span>
    </label>`;
}

function account(settings) {
  return `
    <form id="account-form" class="${ui.card} max-w-2xl space-y-4 p-5 sm:p-6">
      <label class="block"><span class="${ui.label}">Họ và tên</span><input id="accountName" value="${esc(settings.accountName)}" class="${ui.input}" /></label>
      <label class="block"><span class="${ui.label}">Email</span><input id="accountEmail" type="email" value="${esc(settings.email)}" class="${ui.input}" /></label>
      <div class="border-t border-line pt-4">
        <p class="text-sm font-semibold">Đổi mật khẩu</p>
        <p class="mt-1 text-xs text-mist">Để trống mật khẩu mới nếu bạn chỉ muốn cập nhật tên hoặc email.</p>
      </div>
      <label class="block"><span class="${ui.label}">Mật khẩu hiện tại</span><input id="currentPassword" type="password" autocomplete="current-password" class="${ui.input}" /></label>
      <label class="block"><span class="${ui.label}">Mật khẩu mới</span><input id="newPassword" type="password" autocomplete="new-password" class="${ui.input}" /></label>
      <label class="block"><span class="${ui.label}">Xác nhận mật khẩu mới</span><input id="confirmPassword" type="password" autocomplete="new-password" class="${ui.input}" /></label>
      <p id="account-error" class="hidden text-sm font-medium text-rose-600"></p>
      <div class="flex justify-end">
        <button type="submit" class="${ui.primary}">Lưu tài khoản</button>
      </div>
    </form>`;
}

function mountGeneral() {
  document.getElementById("general-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const days = Number(document.getElementById("defaultExpirationDays").value);
    if (!document.getElementById("platformName").value.trim()) {
      toast("Vui lòng nhập tên nền tảng.", "error");
      return;
    }
    if (!Number.isFinite(days) || days < 1) {
      toast("Thời hạn phải từ 1 ngày trở lên.", "error");
      return;
    }
    updateSettings({
      platformName: document.getElementById("platformName").value.trim(),
      defaultExpirationDays: days,
      defaultPasswordProtection: document.getElementById("defaultPasswordProtection").checked,
    });
    toast("Đã lưu cài đặt chung");
    navigate("/admin/settings?tab=general", { replace: true });
  });
  document.getElementById("reset-demo").addEventListener("click", async () => {
    const ok = await confirmDialog({
      title: "Khôi phục dữ liệu demo?",
      message: "Album, cài đặt và mật khẩu demo sẽ trở về như ban đầu. Bạn vẫn giữ trạng thái đăng nhập.",
      confirmText: "Khôi phục dữ liệu",
      danger: true,
    });
    if (!ok) return;
    resetDemo();
    toast("Đã khôi phục dữ liệu demo");
    navigate("/admin", { replace: true });
  });
}

function mountBranding() {
  const saved = getSettings();
  let logoData = saved.logoDataUrl || "";
  onCleanup(() => applyBrand(getSettings()));
  const sync = (key, value) => {
    if (!isHex(value)) return;
    document.documentElement.style.setProperty(key === "primaryColor" ? "--brand-primary" : "--brand-secondary", value);
  };
  document.querySelectorAll("[data-color]").forEach((input) => {
    input.addEventListener("input", () => {
      const hex = document.querySelector(`[data-hex="${input.dataset.color}"]`);
      hex.value = input.value.toUpperCase();
      sync(input.dataset.color, input.value);
    });
  });
  document.querySelectorAll("[data-hex]").forEach((input) => {
    input.addEventListener("input", () => {
      if (!isHex(input.value)) return;
      document.querySelector(`[data-color="${input.dataset.hex}"]`).value = input.value;
      sync(input.dataset.hex, input.value);
    });
  });
  document.getElementById("logo-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 800000) {
      toast("Hãy dùng logo dưới 800 KB.", "error");
      return;
    }
    logoData = await readAsDataUrl(file);
    document.getElementById("logo-preview").innerHTML = `<img src="${logoData}" alt="" class="h-full w-full object-cover" />`;
  });
  document.getElementById("brand-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const primary = document.getElementById("primaryColor").value.trim();
    const secondary = document.getElementById("secondaryColor").value.trim();
    if (!isHex(primary) || !isHex(secondary)) {
      toast("Hãy dùng mã màu hex 6 ký tự, ví dụ #7552F6.", "error");
      return;
    }
    updateSettings({
      primaryColor: primary,
      secondaryColor: secondary,
      slogan: document.getElementById("slogan").value.trim() || "Your Photos. Your Memories.",
      logoDataUrl: logoData,
    });
    toast("Đã lưu thương hiệu");
    navigate("/admin/settings?tab=branding", { replace: true });
  });
}

function mountAccount() {
  document.getElementById("account-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const error = document.getElementById("account-error");
    const name = document.getElementById("accountName").value.trim();
    const email = document.getElementById("accountEmail").value.trim();
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const fail = (message) => {
      error.textContent = message;
      error.classList.remove("hidden");
    };
    error.classList.add("hidden");
    if (!name) return fail("Vui lòng nhập họ và tên.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Vui lòng nhập email hợp lệ.");
    if (newPassword || confirmPassword || currentPassword) {
      if (newPassword.length < 6) return fail("Mật khẩu mới phải có ít nhất 6 ký tự.");
      if (newPassword !== confirmPassword) return fail("Mật khẩu xác nhận không khớp.");
    }
    const result = updateAccount({
      name,
      email,
      currentPassword,
      newPassword: newPassword || "",
    });
    if (!result.ok) return fail("Mật khẩu hiện tại không đúng.");
    toast("Đã cập nhật tài khoản");
    navigate("/admin/settings?tab=account", { replace: true });
  });
}
