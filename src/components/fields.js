import { esc } from "../utils/format.js";
import { ui } from "../utils/ui.js";
import { icon } from "./icons.js";

export function pageHeader({ title, description = "", actions = "" }) {
  return `
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-[28px] font-semibold tracking-tight text-ink md:text-[32px]">${esc(title)}</h1>
        ${description ? `<p class="mt-1 max-w-xl text-sm leading-relaxed text-mist">${esc(description)}</p>` : ""}
      </div>
      ${actions ? `<div class="flex shrink-0 flex-wrap gap-2">${actions}</div>` : ""}
    </div>`;
}

export function textField({
  id,
  label,
  value = "",
  placeholder = "",
  type = "text",
  required = false,
  hint = "",
  autocomplete = "",
}) {
  return `
    <label class="block" for="${id}">
      <span class="${ui.label}">${esc(label)}${required ? ' <span class="text-primary">*</span>' : ""}</span>
      <input id="${id}" name="${id}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${
        autocomplete ? `autocomplete="${autocomplete}"` : ""
      } class="${ui.input}" />
      ${hint ? `<span class="mt-1.5 block text-xs leading-relaxed text-mist">${esc(hint)}</span>` : ""}
      <span data-error="${id}" class="mt-1.5 hidden text-xs font-medium text-rose-600"></span>
    </label>`;
}

export function textArea({ id, label, value = "", placeholder = "", hint = "" }) {
  return `
    <label class="block" for="${id}">
      <span class="${ui.label}">${esc(label)}</span>
      <textarea id="${id}" name="${id}" rows="4" placeholder="${esc(placeholder)}" class="${ui.input} h-auto py-3">${esc(value)}</textarea>
      ${hint ? `<span class="mt-1.5 block text-xs text-mist">${esc(hint)}</span>` : ""}
      <span data-error="${id}" class="mt-1.5 hidden text-xs font-medium text-rose-600"></span>
    </label>`;
}

export function selectField({ id, label, value = "", options, required = false, hint = "" }) {
  return `
    <label class="block" for="${id}">
      <span class="${ui.label}">${esc(label)}${required ? ' <span class="text-primary">*</span>' : ""}</span>
      <span class="relative block">
        <select id="${id}" name="${id}" class="${ui.input} appearance-none pr-10">
          ${options
            .map(
              (option) =>
                `<option value="${esc(option.value)}" ${option.value === value ? "selected" : ""}>${esc(option.label)}</option>`,
            )
            .join("")}
        </select>
        <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mist">${icon("chevron-down", "h-4 w-4")}</span>
      </span>
      ${hint ? `<span class="mt-1.5 block text-xs text-mist">${esc(hint)}</span>` : ""}
      <span data-error="${id}" class="mt-1.5 hidden text-xs font-medium text-rose-600"></span>
    </label>`;
}

export function showErrors(form, errors) {
  form.querySelectorAll("[data-error]").forEach((node) => {
    const key = node.getAttribute("data-error");
    const message = errors[key];
    node.textContent = message || "";
    node.classList.toggle("hidden", !message);
    const field = form.querySelector(`#${key}`);
    field?.classList.toggle("border-rose-400", Boolean(message));
    field?.setAttribute("aria-invalid", message ? "true" : "false");
  });
  const first = Object.keys(errors)[0];
  if (first) form.querySelector(`#${first}`)?.focus();
}
