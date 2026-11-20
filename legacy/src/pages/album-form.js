import { pageHeader, selectField, showErrors, textArea, textField } from "../components/fields.js";
import { confirmDialog } from "../components/dialog.js";
import { toast } from "../components/toast.js";
import { coverSrc, readAsDataUrl, setCoverMemory } from "../data/media.js";
import { albumLimit, createAlbum, currentStudio, getAlbum, getSettings, isOwner, updateAlbum } from "../data/store.js";
import { daysUntil, esc, occasionLabel, slugify, toISODate } from "../utils/format.js";
import { navigate } from "../utils/router.js";
import { ui } from "../utils/ui.js";
import { icon } from "../components/icons.js";
import { suggestTemplateId } from "../components/templates/catalog.js";
import { getTemplateMeta } from "../components/templates/index.js";
import { openTemplatePreview } from "../components/template-selector/TemplatePreview.js";
import { bindTemplateSelector, templateSelector } from "../components/template-selector/TemplateSelector.js";
import { previewSrc } from "./album-template.js";

const OCCASIONS = ["Wedding", "Pre-wedding", "Personal", "Portrait", "Graduation", "Event", "Other"];

function defaultExpiry() {
  const days = Number(getSettings().defaultExpirationDays) || 90;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

function pin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function stepper(editing) {
  const item = (step, label) => `
    <button type="button" data-goto="${step}" class="group flex items-center gap-2.5 text-left">
      <span data-step-dot="${step}" class="grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold"></span>
      <span data-step-label="${step}" class="text-sm font-semibold">${label}</span>
    </button>`;
  return `
    <ol class="mb-6 flex items-center gap-3 border-b border-line pb-5" aria-label="Các bước">
      <li>${item(1, "Thông tin album")}</li>
      <li class="h-px w-8 bg-line sm:w-16" aria-hidden="true"></li>
      <li>${item(2, editing ? "Giao diện" : "Chọn giao diện")}</li>
    </ol>`;
}

export const albumFormPage = {
  title(route) {
    return route.params[0] ? "Chỉnh sửa album · PICORA" : "Album mới · PICORA";
  },
  render(route) {
    const existing = route.params[0] ? getAlbum(route.params[0]) : null;
    if (route.params[0] && !existing) {
      return `<div class="${ui.card} p-8"><h1 class="text-xl font-semibold">Không tìm thấy album</h1><a data-link href="/admin/albums" class="${ui.secondary} mt-4">Quay lại danh sách album</a></div>`;
    }
    const settings = getSettings();
    const value = existing || {
      name: "",
      customerName: "",
      customerPhone: "",
      occasion: "Wedding",
      shootingDate: toISODate(new Date()),
      description: "",
      password: settings.defaultPasswordProtection ? pin() : "",
      expiresAt: defaultExpiry(),
      status: "published",
      allowDownload: true,
    };
    const editing = Boolean(existing);
    const limit = editing ? { ok: true } : albumLimit();
    const studioPath = `/s/${currentStudio()?.slug || "studio"}/`;
    return `
      ${pageHeader({
        title: editing ? "Chỉnh sửa album" : "Tạo album",
        description: editing ? existing.name : "Nhập thông tin album, sau đó chọn giao diện hiển thị cho khách hàng.",
      })}
      ${
        limit.ok
          ? ""
          : `<div class="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
              <p>${esc(limit.error)}</p>
              ${isOwner() ? `<a data-link href="/admin/settings?tab=plan" class="${ui.secondary} shrink-0">Xem gói dịch vụ</a>` : ""}
            </div>`
      }
      <form id="album-form" class="${ui.card} p-5 sm:p-6" novalidate>
        ${stepper(editing)}
        <div data-step="1" class="grid gap-5 lg:grid-cols-2">
          <div class="space-y-4">
            ${textField({ id: "name", label: "Tên album", value: value.name, required: true, placeholder: "Minh Anh & Hoàng Nam" })}
            <p class="-mt-2 text-xs text-mist">Liên kết cho khách · <span id="slug-preview" class="font-medium text-ink">${esc(studioPath)}${esc(existing?.slug || slugify(value.name) || "album")}</span></p>
            ${textField({ id: "customerName", label: "Tên khách hàng", value: value.customerName, required: true, placeholder: "Tên khách hàng" })}
            ${textField({ id: "customerPhone", label: "Số điện thoại", value: value.customerPhone, placeholder: "Không bắt buộc" })}
            ${textField({ id: "shootingDate", label: "Ngày chụp", type: "date", value: value.shootingDate, required: true })}
            ${selectField({
              id: "occasion",
              label: "Dịp chụp",
              value: value.occasion || "Wedding",
              options: OCCASIONS.map((item) => ({ value: item, label: occasionLabel(item) })),
            })}
            ${textArea({ id: "description", label: "Mô tả", value: value.description, placeholder: "Đôi lời ngắn hiển thị trên trang album" })}
          </div>
          <div class="space-y-4">
            <div>
              <span class="${ui.label}">Ảnh bìa</span>
              <label class="relative block cursor-pointer overflow-hidden rounded-2xl border border-dashed border-line bg-canvas">
                <span id="cover-preview" class="flex aspect-[4/3] items-center justify-center text-sm text-mist">
                  ${
                    existing && coverSrc(existing, 800)
                      ? `<img src="${esc(coverSrc(existing, 800))}" alt="" class="h-full w-full object-cover" />`
                      : `<span class="flex flex-col items-center gap-2">${icon("image", "h-5 w-5")} Chọn ảnh bìa</span>`
                  }
                </span>
                <input id="cover" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" class="sr-only" />
              </label>
              <p class="mt-1.5 text-xs text-mist">Hiển thị trên thẻ album và phần đầu trang của khách. Ảnh dung lượng lớn chỉ được giữ trong phiên này.</p>
            </div>
            ${textField({
              id: "password",
              label: "Mật khẩu truy cập",
              value: value.password,
              placeholder: "Để trống nếu không cần mật khẩu",
              hint: settings.defaultPasswordProtection && !editing ? "Đã tự điền vì studio đang bật bảo vệ bằng mật khẩu mặc định." : "",
            })}
            ${textField({ id: "expiresAt", label: "Ngày hết hạn", type: "date", value: value.expiresAt, hint: "Để trống nếu liên kết không giới hạn thời gian." })}
            ${selectField({
              id: "status",
              label: "Trạng thái album",
              value: value.status === "expired" ? "published" : value.status,
              options: [
                { value: "published", label: "Đã xuất bản" },
                { value: "draft", label: "Bản nháp" },
                { value: "hidden", label: "Đã ẩn" },
              ],
            })}
            <label class="flex items-start gap-3 rounded-xl border border-line px-4 py-3">
              <input id="allowDownload" name="allowDownload" type="checkbox" class="mt-0.5 h-4 w-4 accent-[var(--brand-primary)]" ${value.allowDownload !== false ? "checked" : ""} />
              <span>
                <span class="block text-sm font-semibold">Cho phép tải ảnh</span>
                <span class="mt-0.5 block text-xs text-mist">Khách hàng có thể tải từng ảnh hoặc cả album dạng file zip.</span>
              </span>
            </label>
          </div>
        </div>
        <div data-step="2" class="hidden">
          <div class="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 class="text-lg font-semibold">Chọn giao diện album</h2>
              <p class="mt-1 text-sm text-mist">Mọi giao diện đều dùng cùng ảnh và thông tin. Bạn có thể đổi sau mà không làm thay đổi liên kết của khách.</p>
            </div>
            <p id="template-summary" class="text-sm text-mist"></p>
          </div>
          <div id="template-picker"></div>
        </div>
        <div id="form-actions" class="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:items-center">
          <button type="button" id="step-back" class="${ui.ghost} hidden sm:mr-auto">${icon("arrow-left", "h-4 w-4")} Quay lại</button>
          <span class="hidden flex-1 sm:block"></span>
          <button type="button" id="preview-template" class="${ui.secondary} hidden">${icon("eye", "h-4 w-4")} Xem trước giao diện</button>
          <button type="button" id="save-draft" class="${ui.secondary}">Lưu bản nháp</button>
          <button type="submit" id="save-main" class="${ui.primary}">Tiếp tục</button>
        </div>
      </form>`;
  },
  mount(route) {
    const form = document.getElementById("album-form");
    if (!form) return;
    const existing = route.params[0] ? getAlbum(route.params[0]) : null;
    let coverPayload = null;
    let step = route.query.step === "2" && existing ? 2 : 1;
    let templateId = existing?.templateId || suggestTemplateId(document.getElementById("occasion").value);
    let pickedByHand = Boolean(existing);
    const occasion = () => document.getElementById("occasion").value;
    const selectorOptions = () => ({ selected: templateId, suggested: suggestTemplateId(occasion()), current: existing?.templateId });

    const picker = (() => {
      const host = document.getElementById("template-picker");
      host.innerHTML = templateSelector(selectorOptions());
      return bindTemplateSelector(host, {
        getOptions: selectorOptions,
        onSelect: (id) => chooseTemplate(id),
        onPreview: (id) => preview(id),
      });
    })();

    const syncSummary = () => {
      document.getElementById("template-summary").innerHTML = `Đã chọn · <span class="font-semibold text-ink">${esc(getTemplateMeta(templateId).name)}</span>`;
    };

    const chooseTemplate = (id) => {
      templateId = id;
      pickedByHand = true;
      picker.refresh();
      syncSummary();
    };

    const preview = (id) =>
      openTemplatePreview({
        templateId: id,
        srcFor: (candidate) => (existing ? previewSrc(existing, candidate) : `/templates/${candidate}/demo?embed=1`),
        selectedId: () => templateId,
        onSelect: chooseTemplate,
      });

    const syncLabel = () => {
      const status = document.getElementById("status").value;
      const button = document.getElementById("save-main");
      if (existing) button.textContent = "Lưu album";
      else if (step === 1) button.innerHTML = `Tiếp tục ${icon("arrow-right", "h-4 w-4")}`;
      else button.textContent = status === "published" ? "Xuất bản album" : "Tạo album";
    };

    const showStep = (next) => {
      step = next;
      form.querySelectorAll("[data-step]").forEach((section) => section.classList.toggle("hidden", Number(section.dataset.step) !== step));
      form.querySelectorAll("[data-step-dot]").forEach((dot) => {
        const index = Number(dot.dataset.stepDot);
        const done = index < step;
        const active = index === step;
        dot.className = `grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold ${active ? "border-primary bg-primary text-white" : done ? "border-primary bg-primary/10 text-primary" : "border-line text-mist"}`;
        dot.innerHTML = done ? icon("check", "h-3.5 w-3.5") : String(index);
      });
      form.querySelectorAll("[data-step-label]").forEach((label) => {
        label.classList.toggle("text-mist", Number(label.dataset.stepLabel) !== step);
      });
      document.getElementById("step-back").classList.toggle("hidden", step === 1 || Boolean(existing));
      document.getElementById("preview-template").classList.toggle("hidden", step === 1);
      syncSummary();
      syncLabel();
    };

    form.querySelectorAll("[data-goto]").forEach((button) =>
      button.addEventListener("click", () => {
        const target = Number(button.dataset.goto);
        if (target === step) return;
        if (target === 2 && !existing && !validDetails()) return;
        showStep(target);
      }),
    );
    document.getElementById("step-back").addEventListener("click", () => showStep(1));
    document.getElementById("preview-template").addEventListener("click", () => preview(templateId));
    document.getElementById("occasion").addEventListener("change", () => {
      if (!pickedByHand) templateId = suggestTemplateId(occasion());
      picker.refresh();
      syncSummary();
    });
    document.getElementById("status").addEventListener("change", syncLabel);
    document.getElementById("name").addEventListener("input", (event) => {
      const preview = document.getElementById("slug-preview");
      if (!existing) preview.textContent = `/s/${currentStudio()?.slug || "studio"}/${slugify(event.target.value) || "album"}`;
    });
    document.getElementById("cover").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const preview = document.getElementById("cover-preview");
      if (file.size > 900000) {
        coverPayload = { coverSession: true, coverObjectUrl: URL.createObjectURL(file), coverDataUrl: "" };
        toast("Ảnh bìa này chỉ được giữ trong phiên hiện tại.", "info");
      } else {
        coverPayload = { coverDataUrl: await readAsDataUrl(file), coverSession: false, coverObjectUrl: "" };
      }
      const src = coverPayload.coverDataUrl || coverPayload.coverObjectUrl;
      preview.innerHTML = `<img src="${src}" alt="" class="h-full w-full object-cover" />`;
    });

    const collect = (forcedStatus) => {
      const data = new FormData(form);
      const input = {
        name: String(data.get("name") || "").trim(),
        customerName: String(data.get("customerName") || "").trim(),
        customerPhone: String(data.get("customerPhone") || "").trim(),
        shootingDate: String(data.get("shootingDate") || ""),
        occasion: String(data.get("occasion") || "Other"),
        description: String(data.get("description") || "").trim(),
        password: String(data.get("password") || "").trim(),
        expiresAt: String(data.get("expiresAt") || ""),
        status: forcedStatus || String(data.get("status") || "published"),
        allowDownload: data.get("allowDownload") === "on",
        templateId,
      };
      const errors = {};
      if (!input.name) errors.name = "Vui lòng nhập tên album.";
      if (!input.customerName) errors.customerName = "Vui lòng nhập tên khách hàng.";
      if (!input.shootingDate) errors.shootingDate = "Vui lòng chọn ngày chụp.";
      if (input.customerPhone && input.customerPhone.replace(/\D/g, "").length < 8) {
        errors.customerPhone = "Nhập số điện thoại hợp lệ hoặc để trống.";
      }
      return { input, errors };
    };

    const validDetails = () => {
      const { errors } = collect();
      showErrors(form, errors);
      return !Object.keys(errors).length;
    };

    const save = async (status) => {
      const { input, errors } = collect(status);
      if (Object.keys(errors).length) {
        if (step !== 1) showStep(1);
        showErrors(form, errors);
        return;
      }
      showErrors(form, {});
      if (input.status === "published" && input.expiresAt && daysUntil(input.expiresAt) < 0) {
        const ok = await confirmDialog({
          title: "Ngày hết hạn đã qua",
          message: "Khách hàng sẽ thấy album đã hết hạn cho đến khi bạn gia hạn ngày.",
          confirmText: "Vẫn xuất bản",
        });
        if (!ok) return;
      }
      if (existing && existing.status === "published" && input.status === "draft") {
        const ok = await confirmDialog({
          title: "Chuyển album về bản nháp?",
          message: "Khách hàng sẽ không mở được liên kết cho đến khi bạn xuất bản lại.",
          confirmText: "Lưu bản nháp",
        });
        if (!ok) return;
      }
      const cover = coverPayload
        ? {
            coverDataUrl: coverPayload.coverDataUrl || "",
            coverSession: Boolean(coverPayload.coverSession),
            coverId: "",
          }
        : {};
      if (existing) {
        updateAlbum(existing.id, { ...input, ...cover });
        if (coverPayload?.coverObjectUrl) setCoverMemory(existing.id, coverPayload.coverObjectUrl);
        toast(input.status === "draft" ? "Đã lưu bản nháp" : "Đã lưu album");
        if (input.status === "published") navigate(`/admin/albums/${existing.id}/share?published=1`);
        else navigate("/admin/albums");
        return;
      }
      const created = createAlbum({ ...input, ...cover, coverObjectUrl: coverPayload?.coverObjectUrl || "" });
      if (!created) {
        toast(albumLimit().error || "Không thể tạo album.", "error");
        return;
      }
      if (input.status === "published") {
        toast(`Đã xuất bản album với giao diện ${getTemplateMeta(templateId).name}`);
        navigate(`/admin/albums/${created.id}/share?published=1`);
      } else {
        toast(input.status === "draft" ? "Đã lưu bản nháp. Tiếp theo hãy thêm ảnh." : "Đã lưu album. Tiếp theo hãy thêm ảnh.");
        navigate(`/admin/albums/${created.id}/photos`);
      }
    };

    document.getElementById("save-draft").addEventListener("click", () => save("draft"));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!existing && step === 1) {
        if (validDetails()) {
          showStep(2);
          form.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }
      save(document.getElementById("status").value);
    });
    showStep(step);
  },
};
