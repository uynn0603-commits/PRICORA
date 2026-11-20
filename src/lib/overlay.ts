import type { ReactNode } from "react";

// Imperative overlays (toasts, confirm dialogs, context menus, modals) live in one small
// store so any page or store function can open them; <OverlayHost /> renders the state.

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  leaving: boolean;
}

export interface ConfirmState {
  title: string;
  message: string;
  confirmText: string;
  danger: boolean;
  resolve: (value: boolean) => void;
}

export interface MenuItem {
  label: string;
  icon?: string;
  danger?: boolean;
  onClick?: () => void;
}

export interface MenuState {
  rect: { top: number; bottom: number; left: number; right: number };
  anchor: Element;
  items: MenuItem[];
}

export interface ModalAction {
  label: string;
  kind?: "primary" | "secondary";
  close?: boolean;
  onClick?: () => void;
}

export interface ModalState {
  title: string;
  body: ReactNode;
  actions: ModalAction[];
}

export interface OverlayState {
  toasts: ToastItem[];
  confirm: ConfirmState | null;
  menu: MenuState | null;
  modal: ModalState | null;
}

let state: OverlayState = { toasts: [], confirm: null, menu: null, modal: null };
const listeners = new Set<() => void>();
let sequence = 0;

function set(patch: Partial<OverlayState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function subscribeOverlay(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getOverlay(): OverlayState {
  return state;
}

export function toast(message: string, type: ToastType = "success") {
  const id = ++sequence;
  set({ toasts: [...state.toasts, { id, message, type, leaving: false }] });
  setTimeout(() => {
    set({ toasts: state.toasts.map((item) => (item.id === id ? { ...item, leaving: true } : item)) });
    setTimeout(() => set({ toasts: state.toasts.filter((item) => item.id !== id) }), 200);
  }, 3400);
}

export function confirmDialog({
  title,
  message,
  confirmText = "Xác nhận",
  danger = false,
}: {
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
}): Promise<boolean> {
  state.confirm?.resolve(false);
  return new Promise((resolve) => {
    set({
      confirm: {
        title,
        message,
        confirmText,
        danger,
        resolve: (value) => {
          set({ confirm: null });
          resolve(value);
        },
      },
    });
  });
}

export function openMenu(anchor: Element, items: MenuItem[]) {
  const box = anchor.getBoundingClientRect();
  set({ menu: { anchor, items, rect: { top: box.top, bottom: box.bottom, left: box.left, right: box.right } } });
}

export function closeMenu() {
  if (state.menu) set({ menu: null });
}

export function openModal({ title, body, actions = [] }: { title: string; body: ReactNode; actions?: ModalAction[] }) {
  set({ modal: { title, body, actions } });
}

export function closeModal() {
  if (state.modal) set({ modal: null });
}

// Route changes drop anything transient; toasts survive so "Saved" can follow a redirect.
export function closeTransient() {
  state.confirm?.resolve(false);
  set({ menu: null, modal: null, confirm: null });
}
