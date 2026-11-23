import { confirmDialog } from "../components/dialog.js";
import { icon } from "../components/icons.js";
import { studioMark } from "../components/logo.js";
import { toast } from "../components/toast.js";
import { formatPrice, limitLabel, PLANS } from "../data/plans.js";
import {
  addMember,
  applyBrand,
  changePlan,
  currentStudio,
  currentUser,
  getMembers,
  getPlan,
  getSettings,
  isOwner,
  removeMember,
  resetDemo,
  ROLES,
  setMemberRole,
  studioUsage,
  updateAccount,
  updateSettings,
  updateStudio,
} from "../data/store.js";
import { esc, formatBytes, formatDate, initials, isHex, slugify } from "../utils/format.js";
import { onCleanup } from "../utils/lifecycle.js";
import { navigate } from "../utils/router.js";
import { readAsDataUrl } from "../data/media.js";
import { ui } from "../utils/ui.js";

const TABS = [
  { id: "general", label: "Studio", owner: true },
  { id: "branding", label: "Thương hiệu", owner: true },
  { id: "members", label: "Thành viên", owner: true },
  { id: "plan", label: "Gói dịch vụ", owner: true },
  { id: "account", label: "Tài khoản", owner: false },
];

function visibleTabs() {
  const owner = isOwner();
  return TABS.filter((tab) => owner || !tab.owner);
}

function activeTab(route) {
  const tabs = visibleTabs();
  return tabs.some((item) => item.id === route.query.tab) ? route.query.tab : tabs[0].id;
}

const reload = (tab) => navigate(`/admin/settings?tab=${tab}`, { replace: true, keepScroll: true });

export const settingsPage = {
  title() {
    return "Cài đặt · PICORA";
  },
  render(route) {
    const tab = activeTab(route);
    const settings = getSettings();
    const views = { general, branding, members, plan, account };
    return `
      <div class="mb-6">
        <h1 class="text-[28px] font-semibold tracking-tight md:text-[32px]">Cài đặt</h1>
        <p class="mt-1 text-sm text-mist">${isOwner() ? "Thông tin studio, thương hiệu, đội ngũ, gói dịch vụ và tài khoản của bạn." : "Tài khoản đăng nhập của bạn. Chủ studio quản lý các cài đặt còn lại."}</p>
      </div>
      <div class="mb-6 flex gap-5 overflow-x-auto border-b border-line">
        ${visibleTabs()
          .map(
            (item) => `
              <a data-link href="/admin/settings?tab=${item.id}" class="shrink-0 border-b-2 pb-3 text-sm font-semibold ${
                tab === item.id ? "border-primary text-ink" : "border-transparent text-mist"
              }">${item.label}</a>`,
          )
          .join("")}
      </div>
      ${views[tab](settings)}`;
  },
  mount(route) {
    const tab = activeTab(route);
    ({ general: mountGeneral, branding: mountBranding, members: mountMembers, plan: mountPlan, account: mountAccount })[tab]();
  },
};

/* ---------- Studio ---------- */

function general(settings) {
  const studio = currentStudio();
  return `
    <form id="general-form" class="${ui.card} max-w-2xl space-y-4 p-5 sm:p-6">
      <label class="block">
        <span class="${ui.label}">Tên studio</span>
        <input id="studioName" value="${esc(studio.name)}" class="${ui.input}" />
      </label>
      <label class="block">
        <span class="${ui.label}">Địa chỉ studio</span>
        <span class="flex items-center overflow-hidden rounded-xl border border-line bg-white focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
          <span class="shrink-0 border-r border-line bg-canvas px-3 py-2.5 text-sm text-mist">picora.vn/s/</span>
          <input id="studioSlug" value="${esc(studio.slug)}" class="h-11 min-w-0 flex-1 px-3 text-sm outline-none" />
        </span>
        <span class="mt-1.5 block text-xs text-mist">Đổi địa chỉ sẽ làm các liên kết album đã gửi cho khách không còn mở được.</span>
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
        <button type="submit" class="${ui.primary}">Lưu thông tin studio</button>
      </div>
    </form>`;
}

function mountGeneral() {
  const slug = document.getElementById("studioSlug");
  slug.addEventListener("blur", () => {
    slug.value = slugify(slug.value);
  });
  document.getElementById("general-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("studioName").value.trim();
    const days = Number(document.getElementById("defaultExpirationDays").value);
    if (!name) return toast("Vui lòng nhập tên studio.", "error");
    if (!Number.isFinite(days) || days < 1) return toast("Thời hạn phải từ 1 ngày trở lên.", "error");
    const nextSlug = slugify(slug.value);
    if (nextSlug !== currentStudio().slug) {
      const ok = await confirmDialog({
        title: "Đổi địa chỉ studio?",
        message: `Mọi liên kết album sẽ chuyển sang picora.vn/s/${nextSlug}/… Liên kết cũ đã gửi cho khách sẽ không còn mở được.`,
        confirmText: "Đổi địa chỉ",
      });
      if (!ok) return;
    }
    const result = updateStudio({ name, slug: nextSlug });
    if (!result.ok) return toast(result.error, "error");
    updateSettings({
      defaultExpirationDays: days,
      defaultPasswordProtection: document.getElementById("defaultPasswordProtection").checked,
    });
    toast("Đã lưu thông tin studio");
    reload("general");
  });
  document.getElementById("reset-demo").addEventListener("click", async () => {
    const ok = await confirmDialog({
      title: "Khôi phục dữ liệu demo?",
      message: "Toàn bộ studio, tài khoản và album trên nền tảng sẽ trở về bộ mẫu ban đầu. Studio bạn tự đăng ký sẽ bị xóa.",
      confirmText: "Khôi phục dữ liệu",
      danger: true,
    });
    if (!ok) return;
    resetDemo();
    toast("Đã khôi phục dữ liệu demo");
    navigate("/admin", { replace: true });
  });
}

/* ---------- Branding ---------- */

function branding(settings) {
  return `
    <form id="brand-form" class="${ui.card} max-w-2xl space-y-5 p-5 sm:p-6">
      <div>
        <span class="${ui.label}">Logo studio</span>
        <div class="flex items-center gap-4">
          <span id="logo-preview" class="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-line bg-canvas">${studioMark(currentStudio(), 56)}</span>
          <label class="${ui.secondary} cursor-pointer">
            Tải logo lên
            <input id="logo-file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" class="sr-only" />
          </label>
          ${settings.logoDataUrl ? `<button type="button" id="logo-clear" class="text-sm font-semibold text-mist hover:text-ink">Gỡ logo</button>` : ""}
        </div>
        <p class="mt-2 text-xs text-mist">Hiển thị trên album gửi cho khách. Logo vuông hiển thị đẹp nhất. PNG, JPG, WEBP hoặc SVG dưới 800 KB.</p>
      </div>
      ${colorRow("Màu chính", "primaryColor", settings.primaryColor)}
      ${colorRow("Màu phụ", "secondaryColor", settings.secondaryColor)}
      <label class="block">
        <span class="${ui.label}">Khẩu hiệu</span>
        <input id="slogan" value="${esc(settings.slogan)}" class="${ui.input}" />
        <span class="mt-1.5 block text-xs text-mist">Hiển thị ở chân trang album của khách.</span>
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

function mountBranding() {
  let logoData = getSettings().logoDataUrl || "";
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
  document.getElementById("logo-clear")?.addEventListener("click", () => {
    logoData = "";
    document.getElementById("logo-preview").innerHTML = studioMark({ name: currentStudio().name }, 56);
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
    reload("branding");
  });
}

/* ---------- Members ---------- */

function members() {
  const list = getMembers();
  const plan = getPlan();
  const me = currentUser();
  const full = list.length >= plan.members;
  return `
    <div class="grid max-w-4xl gap-4 lg:grid-cols-5">
      <section class="${ui.card} overflow-hidden lg:col-span-3">
        <div class="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 class="font-semibold">Thành viên studio</h2>
          <span class="text-sm text-mist">${list.length} / ${plan.members}</span>
        </div>
        <ul class="divide-y divide-line">
          ${list
            .map(
              (member) => `
                <li class="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">${esc(initials(member.user.name))}</span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-semibold">${esc(member.user.name)}${member.user.id === me.id ? ' <span class="font-normal text-mist">(bạn)</span>' : ""}</span>
                    <span class="block truncate text-xs text-mist">${esc(member.user.email)} · tham gia ${formatDate(member.createdAt)}</span>
                  </span>
                  <span class="relative">
                    <select data-role="${member.user.id}" class="h-9 appearance-none rounded-lg border border-line bg-white pl-3 pr-8 text-sm" ${member.user.id === me.id ? "disabled" : ""}>
                      ${Object.entries(ROLES)
                        .map(([value, label]) => `<option value="${value}" ${member.role === value ? "selected" : ""}>${label}</option>`)
                        .join("")}
                    </select>
                    <span class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-mist">${icon("chevron-down", "h-3.5 w-3.5")}</span>
                  </span>
                  ${
                    member.user.id === me.id
                      ? '<span class="w-9"></span>'
                      : `<button type="button" data-remove="${member.user.id}" data-name="${esc(member.user.name)}" class="grid h-9 w-9 place-items-center rounded-lg text-mist hover:bg-rose-50 hover:text-rose-600" aria-label="Xóa ${esc(member.user.name)}">${icon("trash-2", "h-4 w-4")}</button>`
                  }
                </li>`,
            )
            .join("")}
        </ul>
        <p class="border-t border-line px-5 py-3 text-xs leading-relaxed text-mist">Chủ studio quản lý thương hiệu, thành viên và gói dịch vụ. Nhân viên quản lý album, ảnh và liên kết chia sẻ.</p>
      </section>
      <form id="member-form" class="${ui.card} space-y-3 p-5 lg:col-span-2" novalidate>
        <h2 class="font-semibold">Thêm thành viên</h2>
        ${
          full
            ? `<p class="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-950">Gói ${esc(plan.name)} cho phép tối đa ${plan.members} thành viên. <a data-link href="/admin/settings?tab=plan" class="font-semibold underline">Nâng cấp gói</a></p>`
            : ""
        }
        <label class="block"><span class="${ui.label}">Họ và tên</span><input id="memberName" class="${ui.input}" /></label>
        <label class="block"><span class="${ui.label}">Email</span><input id="memberEmail" type="email" class="${ui.input}" /></label>
        <label class="block">
          <span class="${ui.label}">Vai trò</span>
          <span class="relative block">
            <select id="memberRole" class="${ui.input} appearance-none pr-10">
              <option value="staff">${ROLES.staff}</option>
              <option value="owner">${ROLES.owner}</option>
            </select>
            <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mist">${icon("chevron-down", "h-4 w-4")}</span>
          </span>
        </label>
        <label class="block">
          <span class="${ui.label}">Mật khẩu tạm</span>
          <input id="memberPassword" type="text" class="${ui.input}" placeholder="Ít nhất 6 ký tự" />
          <span class="mt-1.5 block text-xs text-mist">Bản demo chưa gửi email mời. Hãy gửi mật khẩu này cho thành viên. Nếu email đã có tài khoản PICORA, người đó dùng mật khẩu hiện tại.</span>
        </label>
        <button type="submit" class="${ui.primary} w-full" ${full ? "disabled" : ""}>${icon("plus", "h-4 w-4")} Thêm vào studio</button>
      </form>
    </div>`;
}

function mountMembers() {
  document.querySelectorAll("[data-role]").forEach((select) =>
    select.addEventListener("change", () => {
      const result = setMemberRole(select.dataset.role, select.value);
      if (!result.ok) toast(result.error, "error");
      else toast("Đã cập nhật vai trò");
      reload("members");
    }),
  );
  document.querySelectorAll("[data-remove]").forEach((button) =>
    button.addEventListener("click", async () => {
      const ok = await confirmDialog({
        title: `Xóa ${button.dataset.name} khỏi studio?`,
        message: "Người này sẽ không đăng nhập vào studio được nữa. Album và ảnh của studio vẫn giữ nguyên.",
        confirmText: "Xóa thành viên",
        danger: true,
      });
      if (!ok) return;
      const result = removeMember(button.dataset.remove);
      if (!result.ok) return toast(result.error, "error");
      toast("Đã xóa thành viên");
      reload("members");
    }),
  );
  document.getElementById("member-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const result = addMember({
      name: document.getElementById("memberName").value,
      email: document.getElementById("memberEmail").value,
      role: document.getElementById("memberRole").value,
      password: document.getElementById("memberPassword").value,
    });
    if (!result.ok) return toast(result.error, "error");
    toast(result.existing ? `Đã thêm ${result.user.name} (tài khoản có sẵn)` : `Đã thêm ${result.user.name}`);
    reload("members");
  });
}

/* ---------- Plan ---------- */

function meter(label, used, limit, format = (value) => value.toLocaleString("vi-VN")) {
  const ratio = limit == null ? 0 : Math.min(1, used / limit);
  const tone = ratio >= 0.95 ? "bg-rose-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-primary";
  return `
    <div>
      <div class="flex items-baseline justify-between text-sm">
        <span class="font-medium">${label}</span>
        <span class="text-mist">${format(used)} / ${limit == null ? "Không giới hạn" : format(limit)}</span>
      </div>
      <div class="mt-2 h-2 overflow-hidden rounded-full bg-line"><div class="h-full rounded-full ${tone}" style="width:${limit == null ? 4 : Math.max(2, Math.round(ratio * 100))}%"></div></div>
    </div>`;
}

function plan() {
  const current = getPlan();
  const usage = studioUsage();
  return `
    <section class="${ui.card} max-w-5xl p-5 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p class="text-sm text-mist">Gói hiện tại</p>
          <h2 class="mt-1 text-xl font-semibold">${esc(current.name)}${current.price ? ` <span class="text-base font-normal text-mist">· ${formatPrice(current.price)}</span>` : ""}</h2>
        </div>
      </div>
      <div class="mt-5 grid gap-5 md:grid-cols-3">
        ${meter("Dung lượng", usage.storage, current.storage, formatBytes)}
        ${meter("Album", usage.albums, current.albums)}
        ${meter("Thành viên", usage.members, current.members)}
      </div>
    </section>
    <section class="mt-4 grid max-w-5xl gap-4 md:grid-cols-3">
      ${PLANS.map((item) => {
        const active = item.id === current.id;
        return `
          <article class="flex flex-col rounded-2xl border-2 bg-white p-5 ${active ? "border-primary" : "border-line"}">
            <h3 class="text-lg font-semibold">${esc(item.name)}</h3>
            <p class="mt-1 text-sm text-mist">${esc(item.description)}</p>
            <p class="mt-4 text-2xl font-semibold tracking-tight">${formatPrice(item.price)}</p>
            <ul class="mt-4 space-y-2 text-sm">
              <li class="flex gap-2">${icon("check", "h-4 w-4 shrink-0 text-primary")} ${formatBytes(item.storage)} lưu trữ</li>
              <li class="flex gap-2">${icon("check", "h-4 w-4 shrink-0 text-primary")} ${limitLabel(item.albums, "album")}</li>
              <li class="flex gap-2">${icon("check", "h-4 w-4 shrink-0 text-primary")} ${limitLabel(item.members, "thành viên")}</li>
              <li class="flex gap-2">${icon("check", "h-4 w-4 shrink-0 text-primary")} 4 giao diện album cao cấp</li>
            </ul>
            <div class="mt-auto pt-5">
              ${
                active
                  ? `<span class="${ui.secondary} w-full cursor-default border-primary text-primary">${icon("check", "h-4 w-4")} Đang dùng</span>`
                  : `<button type="button" data-plan="${item.id}" class="${item.price > current.price ? ui.primary : ui.secondary} w-full">${item.price > current.price ? "Nâng cấp" : "Chuyển xuống"} gói ${esc(item.name)}</button>`
              }
            </div>
          </article>`;
      }).join("")}
    </section>
    <p class="mt-4 max-w-5xl text-xs text-mist">Bản demo chưa tích hợp thanh toán. Gói mới có hiệu lực ngay khi bạn xác nhận.</p>`;
}

function mountPlan() {
  document.querySelectorAll("[data-plan]").forEach((button) =>
    button.addEventListener("click", async () => {
      const target = PLANS.find((item) => item.id === button.dataset.plan);
      const ok = await confirmDialog({
        title: `Chuyển sang gói ${target.name}?`,
        message: `Giới hạn mới: ${formatBytes(target.storage)} lưu trữ, ${limitLabel(target.albums, "album")}, ${limitLabel(target.members, "thành viên")}.`,
        confirmText: "Xác nhận đổi gói",
      });
      if (!ok) return;
      const result = changePlan(target.id);
      if (!result.ok) return toast(result.error, "error");
      toast(`Studio đã chuyển sang gói ${result.plan.name}`);
      reload("plan");
    }),
  );
}

/* ---------- Account ---------- */

function account() {
  const user = currentUser();
  return `
    <form id="account-form" class="${ui.card} max-w-2xl space-y-4 p-5 sm:p-6">
      <label class="block"><span class="${ui.label}">Họ và tên</span><input id="accountName" value="${esc(user.name)}" class="${ui.input}" /></label>
      <label class="block"><span class="${ui.label}">Email</span><input id="accountEmail" type="email" value="${esc(user.email)}" class="${ui.input}" /></label>
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
    const result = updateAccount({ name, email, currentPassword, newPassword: newPassword || "" });
    if (!result.ok && result.error === "email") return fail("Email này đã được tài khoản khác sử dụng.");
    if (!result.ok) return fail("Mật khẩu hiện tại không đúng.");
    toast("Đã cập nhật tài khoản");
    reload("account");
  });
}
