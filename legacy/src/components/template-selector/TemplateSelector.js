import { listTemplates } from "../templates/index.js";
import { templateCard } from "./TemplateCard.js";

export function templateSelector(options) {
  return `<div data-template-grid class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">${cards(options)}</div>`;
}

function cards({ selected, suggested, current, selectLabel }) {
  return listTemplates()
    .map((meta) =>
      templateCard(meta, {
        selected: meta.id === selected,
        suggested: meta.id === suggested,
        current: meta.id === current,
        selectLabel,
      }),
    )
    .join("");
}

// Returns a small controller so the host page can re-render after its own state changes.
export function bindTemplateSelector(container, { getOptions, onSelect, onPreview }) {
  const grid = container.querySelector("[data-template-grid]");
  grid.addEventListener("click", (event) => {
    const select = event.target.closest("[data-template-select]");
    if (select) {
      onSelect(select.dataset.templateSelect);
      return;
    }
    const preview = event.target.closest("[data-template-preview]");
    if (preview) onPreview(preview.dataset.templatePreview);
  });
  return {
    refresh() {
      grid.innerHTML = cards(getOptions());
    },
  };
}
