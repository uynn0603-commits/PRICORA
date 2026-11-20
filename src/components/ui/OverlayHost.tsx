"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { closeMenu, closeModal, getOverlay, subscribeOverlay, type MenuState } from "@/lib/overlay";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/format";
import { Icon } from "./Icon";

const SERVER_STATE = { toasts: [], confirm: null, menu: null, modal: null };

export function OverlayHost() {
  const state = useSyncExternalStore(subscribeOverlay, getOverlay, () => SERVER_STATE);
  const blocking = Boolean(state.confirm || state.modal);

  useEffect(() => {
    if (!blocking) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [blocking]);

  return (
    <>
      {state.menu && <ContextMenu menu={state.menu} />}
      {state.modal && (
        <div
          className="fixed inset-0 z-[75] grid place-items-center bg-ink/40 px-4"
          onClick={(event) => event.target === event.currentTarget && closeModal()}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6" role="dialog" aria-modal="true">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold tracking-tight">{state.modal.title}</h2>
              <button type="button" onClick={closeModal} className="grid h-8 w-8 place-items-center rounded-lg text-mist hover:bg-canvas" aria-label="Đóng">
                <Icon name="x" />
              </button>
            </div>
            <div className="mt-3 text-sm leading-relaxed text-mist">{state.modal.body}</div>
            <div className="mt-6 flex justify-end gap-2">
              {(state.modal.actions.length ? state.modal.actions : [{ label: "Đóng", kind: "primary" as const }]).map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className={action.kind === "primary" ? ui.primary : ui.secondary}
                  onClick={() => {
                    action.onClick?.();
                    if (action.close !== false) closeModal();
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {state.confirm && <Confirm />}
      {state.toasts.length > 0 && (
        <div className="pointer-events-none fixed bottom-[calc(1rem+var(--toast-offset,0px))] right-4 z-[80] flex w-[min(100%-2rem,380px)] flex-col gap-2">
          {state.toasts.map((item) => (
            <div
              key={item.id}
              role="status"
              className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-[0_12px_40px_rgba(25,24,39,0.12)] transition-opacity duration-200"
              style={{ opacity: item.leaving ? 0 : 1 }}
            >
              <span className={cn("mt-0.5", item.type === "error" ? "text-rose-600" : item.type === "info" ? "text-primary" : "text-emerald-600")}>
                <Icon name={item.type === "error" ? "circle-alert" : item.type === "info" ? "info" : "circle-check"} />
              </span>
              <p className="text-sm font-medium leading-5 text-ink">{item.message}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Confirm() {
  const confirm = getOverlay().confirm!;
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    okRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") confirm.resolve(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirm]);
  return (
    <div
      className="fixed inset-0 z-[78] grid place-items-center bg-ink/40 px-4"
      onClick={(event) => event.target === event.currentTarget && confirm.resolve(false)}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title" className="text-lg font-semibold tracking-tight">
          {confirm.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-mist">{confirm.message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={ui.secondary} onClick={() => confirm.resolve(false)}>
            Hủy
          </button>
          <button ref={okRef} type="button" className={confirm.danger ? ui.danger : ui.primary} onClick={() => confirm.resolve(true)}>
            {confirm.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function ContextMenu({ menu }: { menu: MenuState }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const width = node.offsetWidth;
    const height = node.offsetHeight;
    let left = Math.min(menu.rect.right - width, window.innerWidth - width - 8);
    left = Math.max(8, left);
    let top = menu.rect.bottom + 6;
    if (top + height > window.innerHeight - 8) top = Math.max(8, menu.rect.top - height - 6);
    setPosition({ left, top });
  }, [menu]);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (ref.current?.contains(target) || menu.anchor.contains(target)) return;
      closeMenu();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    const timer = setTimeout(() => document.addEventListener("click", onDoc), 0);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [menu]);

  return (
    <div
      ref={ref}
      className="fixed z-[60] w-52 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-[0_16px_40px_rgba(25,24,39,0.12)]"
      style={position ? { left: position.left, top: position.top } : { left: -9999, top: -9999 }}
    >
      {menu.items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            closeMenu();
            item.onClick?.();
          }}
          className={cn(
            "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm",
            item.danger ? "text-rose-600 hover:bg-rose-50" : "text-ink hover:bg-canvas",
          )}
        >
          {item.icon ? <Icon name={item.icon} /> : <span className="w-4" />}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
