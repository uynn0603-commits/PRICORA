import { confirmDialog } from "../components/dialog.js";
import { icon } from "../components/icons.js";
import { logoLockup, studioMark } from "../components/logo.js";
import { closeModal, openModal } from "../components/modal.js";
import { toast } from "../components/toast.js";
import { formatPrice, PLANS } from "../data/plans.js";
import { clearSession, createStudio, getSession, listStudios, setStudioPlan, setStudioStatus } from "../data/store.js";
import { esc, formatBytes, formatDate, slugify } from "../utils/format.js";
import { navigate, rerender } from "../utils/router.js";
import { ui } from "../utils/ui.js";

const STATUS = {
  active: { label: "Hoạt động", className: "bg-emerald-50 text-emerald-700" },
  suspended: { label: "Tạm khóa", className: "bg-rose-50 text-rose-700" },
};

function stat(label, value, iconName) {
  return `
    <article class="${ui.card} p-5">
      <div class="flex items-center justify-between text-mist">
        <span class="text-sm">${label}</span>
        ${icon(iconName, "h-4 w-4")}
      </div>
      <p class="mt-3 text-2xl font-semibold tracking-tight">${value}</p>
    </article>`;
}

function usageCell(used, limit) {
  const ratio = Math.min(1, used / limit);
  const tone = ratio >= 0.95 ? "bg-rose-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-primary";
  return `
    <span class="block text-sm">${formatBytes(used)} <span class="text-mist">/ ${formatBytes(limit)}</span></span>
    <span class="mt-1.5 block h-1.5 w-28 overflow-hidden rounded-full bg-line"><span class="block h-full rounded-full ${tone}" style="width:${Math.max(2, Math.round(ratio * 100))}%"></span></span>`;
}

function field(id, label, { type = "text", placeholder = "", hint = "", prefix = "" } = {}) {
  const input = `<input id="${id}" type="${type}" placeholder="${esc(placeholder)}" class="${
    prefix ? "h-11 min-w-0 flex-1 px-3 text-sm text-ink outline-none" : ui.input
  }" />`;
  return `
    <label class="block">
      <span class="${ui.label}">${label}</span>
      ${
        prefix
          ? `<span class="flex items-center overflow-hidden rounded-xl border border-line bg-white focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
              <span class="shrink-0 border-r border-line bg-canvas px-3 py-2.5 text-sm text-mist">${prefix}</span>${input}
            </span>`
          : input
      }
      ${hint ? `<span class="mt-1 block text-xs text-mist">${hint}</span>` : ""}
      <span data-error="${id}" class="mt-1 hidden text-xs font-medium text-rose-600"></span>
    </label>`;
}

function openCreateStudio() {
  openModal({
    title: "Tạo studio mới",
    body: `
      <form id="create-studio-form" class="space-y-3 text-left" novalidate>
        ${field("studioName", "Tên studio", { placeholder: "Ví dụ: Nắng Studio" })}
        ${field("studioSlug", "Địa chỉ studio", { placeholder: "nang-studio", prefix: "picora.vn/s/" })}
        <label class="block">
          <span class="${ui.label}">Gói dịch vụ</span>
          <span class="relative block">
            <select id="planId" class="${ui.input} appearance-none pr-10">
              ${PLANS.map((item) => `<option value="${item.id}">${esc(item.name)}${item.price ? ` · ${formatPrice(item.price)}` : ""}</option>`).join("")}
            </select>
            <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mist">${icon("chevron-down", "h-4 w-4")}</span>
          </span>
        </label>
        <div class="border-t border-line pt-3">
          <p class="text-sm font-semibold text-ink">Chủ studio</p>
          <p class="mt-0.5 text-xs">Nếu email đã có tài khoản PICORA, người đó dùng mật khẩu hiện tại và không cần nhập tên, mật khẩu.</p>
        </div>
        ${field("ownerEmail", "Email", { type: "email" })}
        ${field("ownerName", "Họ và tên")}
        ${field("ownerPassword", "Mật khẩu tạm", { placeholder: "Ít nhất 6 ký tự", hint: "Bản demo chưa gửi email. Hãy gửi mật khẩu này cho chủ studio." })}
      </form>`,
    actions: [
      { label: "Hủy" },
      { label: "Tạo studio", kind: "primary", close: false, onClick: submitCreateStudio },
    ],
  });
  const name = document.getElementById("studioName");
  const slug = document.getElementById("studioSlug");
  let slugTouched = false;
  name.addEventListener("input", () => {
    if (!slugTouched) slug.value = slugify(name.value);
  });
  slug.addEventListener("input", () => {
    slugTouched = true;
  });
  slug.addEventListener("blur", () => {
    slug.value = slugify(slug.value);
  });
  document.getElementById("create-studio-form").addEventListener("input", (event) => {
    document.querySelector(`#create-studio-form [data-error="${event.target.id}"]`)?.classList.add("hidden");
  });
  document.getElementById("create-studio-form").addEventListener("submit", (event) => {
    event.preventDefault();
    submitCreateStudio();
  });
  name.focus();
}

function submitCreateStudio() {
  const value = (id) => document.getElementById(id).value;
  const result = createStudio({
    studioName: value("studioName"),
    studioSlug: value("studioSlug"),
    planId: value("planId"),
    ownerName: value("ownerName"),
    ownerEmail: value("ownerEmail"),
    ownerPassword: value("ownerPassword"),
  });
  document.querySelectorAll("#create-studio-form [data-error]").forEach((node) => {
    const message = result.errors?.[node.dataset.error];
    node.textContent = message || "";
    node.classList.toggle("hidden", !message);
  });
  if (!result.ok) return;
  closeModal();
  toast(
    result.existing
      ? `Đã tạo ${result.studio.name}. ${result.owner.name} là chủ studio.`
      : `Đã tạo ${result.studio.name} và tài khoản ${result.owner.email}.`,
  );
  rerender();
}

export const platformPage = {
  title() {
    return "Quản trị nền tảng · PICORA";
  },
  render() {
    const session = getSession();
    const rows = listStudios();
    const active = rows.filter((row) => row.studio.status === "active");
    const revenue = active.reduce((sum, row) => sum + row.plan.price, 0);
    const albums = rows.reduce((sum, row) => sum + row.usage.albums, 0);
    const storage = rows.reduce((sum, row) => sum + row.usage.storage, 0);
    return `
      <div class="min-h-screen bg-canvas">
        <header class="border-b border-line bg-white">
          <div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5">
            <div class="flex items-center gap-3">
              ${logoLockup({ size: 30 })}
              <span class="hidden rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white sm:inline">Quản trị nền tảng</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="hidden text-right sm:block">
                <span class="block text-sm font-semibold">${esc(session.name)}</span>
                <span class="block text-xs text-mist">${esc(session.email)}</span>
              </span>
              <button type="button" id="platform-logout" class="${ui.secondary}">${icon("log-out", "h-4 w-4")} Đăng xuất</button>
            </div>
          </div>
        </header>
        <main class="mx-auto max-w-7xl px-5 py-8">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 class="text-[28px] font-semibold tracking-tight md:text-[32px]">Studio trên PICORA</h1>
              <p class="mt-1 text-sm text-mist">Theo dõi gói dịch vụ, dung lượng và trạng thái của từng studio.</p>
            </div>
            <button type="button" id="create-studio" class="${ui.primary}">${icon("plus", "h-4 w-4")} Tạo studio</button>
          </div>
          <section class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            ${stat("Studio", `${rows.length} <span class="text-sm font-normal text-mist">· ${active.length} hoạt động</span>`, "building-2")}
            ${stat("Album", albums.toLocaleString("vi-VN"), "images")}
            ${stat("Dung lượng đã dùng", formatBytes(storage), "hard-drive")}
            ${stat("Doanh thu dự kiến", formatPrice(revenue), "credit-card")}
          </section>
          <section class="${ui.card} mt-6 overflow-x-auto">
            <table class="w-full min-w-[920px] text-left">
              <thead class="border-b border-line text-xs font-semibold uppercase tracking-wider text-mist">
                <tr>
                  <th class="px-5 py-3">Studio</th>
                  <th class="px-5 py-3">Chủ studio</th>
                  <th class="px-5 py-3">Gói</th>
                  <th class="px-5 py-3">Album</th>
                  <th class="px-5 py-3">Dung lượng</th>
                  <th class="px-5 py-3">Thành viên</th>
                  <th class="px-5 py-3">Trạng thái</th>
                  <th class="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line">
                ${rows
                  .map(({ studio, plan, usage, owner }) => {
                    const status = STATUS[studio.status] || STATUS.active;
                    const suspended = studio.status === "suspended";
                    return `
                      <tr class="${suspended ? "bg-canvas/60" : ""}">
                        <td class="px-5 py-4">
                          <span class="flex items-center gap-3">
                            ${studioMark(studio, 36)}
                            <span class="min-w-0">
                              <span class="block truncate text-sm font-semibold">${esc(studio.name)}</span>
                              <span class="block truncate text-xs text-mist">/s/${esc(studio.slug)} · tạo ${formatDate(studio.createdAt)}</span>
                            </span>
                          </span>
                        </td>
                        <td class="px-5 py-4 text-sm">
                          ${owner ? `<span class="block font-medium">${esc(owner.name)}</span><span class="block text-xs text-mist">${esc(owner.email)}</span>` : '<span class="text-mist">Chưa có</span>'}
                        </td>
                        <td class="px-5 py-4">
                          <span class="relative block w-36">
                            <select data-plan="${studio.id}" class="h-9 w-full appearance-none rounded-lg border border-line bg-white pl-3 pr-8 text-sm">
                              ${PLANS.map((item) => `<option value="${item.id}" ${item.id === plan.id ? "selected" : ""}>${esc(item.name)}</option>`).join("")}
                            </select>
                            <span class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-mist">${icon("chevron-down", "h-3.5 w-3.5")}</span>
                          </span>
                        </td>
                        <td class="px-5 py-4 text-sm">${usage.albums}${plan.albums == null ? "" : `<span class="text-mist"> / ${plan.albums}</span>`}</td>
                        <td class="px-5 py-4">${usageCell(usage.storage, plan.storage)}</td>
                        <td class="px-5 py-4 text-sm">${usage.members}<span class="text-mist"> / ${plan.members}</span></td>
                        <td class="px-5 py-4"><span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}">${status.label}</span></td>
                        <td class="px-5 py-4 text-right">
                          <button type="button" data-status="${studio.id}" data-name="${esc(studio.name)}" data-next="${suspended ? "active" : "suspended"}" class="${ui.ghost} ${suspended ? "" : "hover:text-rose-600"}">
                            ${icon(suspended ? "circle-check" : "ban", "h-4 w-4")} ${suspended ? "Mở lại" : "Tạm khóa"}
                          </button>
                        </td>
                      </tr>`;
                  })
                  .join("")}
              </tbody>
            </table>
          </section>
          <p class="mt-4 text-xs text-mist">Doanh thu dự kiến tính theo giá gói của các studio đang hoạt động. Bản demo chưa tích hợp thanh toán.</p>
        </main>
      </div>`;
  },
  mount() {
    document.getElementById("create-studio").addEventListener("click", openCreateStudio);
    document.getElementById("platform-logout").addEventListener("click", () => {
      clearSession();
      navigate("/login", { replace: true });
    });
    document.querySelectorAll("[data-plan]").forEach((select) =>
      select.addEventListener("change", () => {
        const result = setStudioPlan(select.dataset.plan, select.value);
        if (!result.ok) return toast("Không thể đổi gói.", "error");
        toast(result.warning ? `Đã đổi gói. Lưu ý: ${result.warning}` : "Đã đổi gói dịch vụ", result.warning ? "error" : undefined);
        rerender();
      }),
    );
    document.querySelectorAll("[data-status]").forEach((button) =>
      button.addEventListener("click", async () => {
        const suspend = button.dataset.next === "suspended";
        if (suspend) {
          const ok = await confirmDialog({
            title: `Tạm khóa ${button.dataset.name}?`,
            message: "Thành viên studio sẽ không đăng nhập được và mọi album của studio sẽ tạm ẩn với khách. Dữ liệu vẫn được giữ nguyên.",
            confirmText: "Tạm khóa studio",
            danger: true,
          });
          if (!ok) return;
        }
        setStudioStatus(button.dataset.status, button.dataset.next);
        toast(suspend ? "Đã tạm khóa studio" : "Studio đã hoạt động trở lại");
        rerender();
      }),
    );
  },
};
