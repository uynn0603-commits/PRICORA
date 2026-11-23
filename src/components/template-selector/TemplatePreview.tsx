"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ui } from "@/lib/ui";
import { getTemplateMeta, listTemplates } from "../templates";
import { Icon } from "../ui/Icon";
import { DevicePreview, type Device } from "./DevicePreview";

// srcFor(templateId) decides which photos are shown: demo albums while creating, the
// album's own photos when changing an existing album's template.
export function TemplatePreview({
  templateId,
  srcFor,
  selectedId,
  onSelect,
  onClose,
  selectLabel = "Chọn giao diện",
}: {
  templateId: string;
  srcFor: (id: string) => string;
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  selectLabel?: string;
}) {
  const [current, setCurrent] = useState(templateId);
  const [device, setDevice] = useState<Device>(() => (window.innerWidth < 768 ? "mobile" : "desktop"));
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, []);

  const meta = getTemplateMeta(current);
  const chosen = current === selectedId;
  const src = srcFor(current);

  const segment = (value: Device, label: string, iconName: string) => (
    <button
      type="button"
      onClick={() => setDevice(value)}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition ${device === value ? "bg-white text-ink" : "text-white/70 hover:text-white"}`}
      aria-pressed={device === value}
    >
      <Icon name={iconName} className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return createPortal(
    <div className="fixed inset-0 z-[65] flex flex-col bg-[#14131C]" role="dialog" aria-modal="true">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2.5 text-white sm:px-5">
        <button ref={closeRef} type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-white/80 hover:bg-white/10" aria-label="Đóng xem trước">
          <Icon name="x" className="h-5 w-5" />
        </button>
        <div className="mr-auto min-w-0">
          <label className="sr-only" htmlFor="preview-template">
            Giao diện
          </label>
          <select
            id="preview-template"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            className="h-9 max-w-[52vw] rounded-lg border border-white/15 bg-transparent px-2 text-sm font-semibold text-white focus:outline-none [&>option]:text-ink"
          >
            {listTemplates().map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex rounded-lg bg-white/10 p-0.5">
          {segment("desktop", "Máy tính", "monitor")}
          {segment("mobile", "Điện thoại", "smartphone")}
        </div>
        <a
          href={src.replace(/[?&]embed=1/, "")}
          target="_blank"
          rel="noopener"
          className="hidden h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white/80 hover:bg-white/10 md:inline-flex"
        >
          <Icon name="external-link" className="h-3.5 w-3.5" /> Mở trong tab mới
        </a>
        <button
          type="button"
          onClick={() => onSelect(current)}
          className={`${chosen ? `${ui.secondary} border-white/20 bg-white/10 text-white hover:bg-white/15` : ui.primary} h-9 px-3 text-xs sm:px-4`}
        >
          {chosen ? (
            <>
              <Icon name="check" className="h-4 w-4" /> Đã chọn
            </>
          ) : (
            selectLabel
          )}
        </button>
      </div>
      <p className="shrink-0 px-5 pt-3 text-center text-xs text-white/50">
        {meta.name} · {meta.style.join(" · ")}
      </p>
      <div className="min-h-0 flex-1 p-3 sm:p-6">
        <DevicePreview key={device} src={src} device={device} />
      </div>
    </div>,
    document.body,
  );
}
