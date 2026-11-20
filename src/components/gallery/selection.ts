"use client";

import { useSyncExternalStore } from "react";
import { toast } from "@/lib/overlay";
import { submitSelection } from "@/lib/store";
import type { AlbumSelection } from "@/lib/types";

export interface SelectionConfig {
  albumId: string;
  studioSlug: string;
  albumSlug: string;
  // 0 means the client may pick any number of photos.
  limit: number;
  locked: boolean;
  // Studio members previewing the album can try the picker but not submit.
  preview: boolean;
  submitted: AlbumSelection | null;
  photoIds: string[];
}

export interface SelectionState extends SelectionConfig {
  picked: string[];
  note: string;
  sending: boolean;
}

let state: SelectionState | null = null;
const listeners = new Set<() => void>();

function set(next: SelectionState | null) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const draftKey = (albumId: string) => `picora.selection.${albumId}`;

// Unsent picks survive a reload or closing the tab, so a long album can be chosen over several visits.
function readDraft(albumId: string): { picked: string[]; note: string } | null {
  try {
    const raw = JSON.parse(localStorage.getItem(draftKey(albumId)) || "null");
    return raw && Array.isArray(raw.picked) ? { picked: raw.picked.map(String), note: String(raw.note || "") } : null;
  } catch {
    return null;
  }
}

function saveDraft(next: SelectionState) {
  try {
    if (!isDirty(next)) localStorage.removeItem(draftKey(next.albumId));
    else localStorage.setItem(draftKey(next.albumId), JSON.stringify({ picked: next.picked, note: next.note }));
  } catch {
    // Private mode: picks still work for this visit.
  }
}

export function startSelection(config: SelectionConfig | null) {
  if (!config) {
    if (state) set(null);
    return;
  }
  const known = new Set(config.photoIds);
  const draft = config.locked ? null : readDraft(config.albumId);
  const picked = (draft?.picked || config.submitted?.photoIds || []).filter((id) => known.has(id));
  set({ ...config, picked, note: draft?.note ?? config.submitted?.note ?? "", sending: false });
}

export function stopSelection(albumId: string) {
  if (state?.albumId === albumId) set(null);
}

export function useSelection(): SelectionState | null {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => null,
  );
}

export function isDirty(current: SelectionState): boolean {
  const sent = current.submitted;
  if (!sent) return current.picked.length > 0 || current.note.trim() !== "";
  if (sent.note !== current.note.trim() || sent.photoIds.length !== current.picked.length) return true;
  const ids = new Set(sent.photoIds);
  return current.picked.some((id) => !ids.has(id));
}

export function togglePick(photoId: string) {
  if (!state) return;
  if (state.locked) {
    toast("Studio đã chốt danh sách ảnh bạn chọn.", "info");
    return;
  }
  const has = state.picked.includes(photoId);
  if (!has && state.limit && state.picked.length >= state.limit) {
    toast(`Bạn đã chọn đủ ${state.limit} ảnh. Bỏ chọn một ảnh để chọn ảnh khác.`, "info");
    return;
  }
  // Picks keep album order so the studio reads them in the order they were shot.
  const picked = has ? state.picked.filter((id) => id !== photoId) : state.photoIds.filter((id) => id === photoId || state!.picked.includes(id));
  const next = { ...state, picked };
  saveDraft(next);
  set(next);
}

export function setSelectionNote(note: string) {
  if (!state) return;
  const next = { ...state, note: note.slice(0, 2000) };
  saveDraft(next);
  set(next);
}

export async function sendSelection(): Promise<boolean> {
  if (!state || state.sending) return false;
  if (state.preview) {
    toast("Đây là chế độ xem trước. Khách hàng sẽ gửi lựa chọn từ đường dẫn album.", "info");
    return false;
  }
  if (!state.picked.length) {
    toast("Hãy chọn ít nhất một ảnh.", "info");
    return false;
  }
  const current = state;
  set({ ...current, sending: true });
  const result = await submitSelection(current.studioSlug, current.albumSlug, current.picked, current.note.trim());
  if (!state || state.albumId !== current.albumId) return result.ok;
  if (!result.ok) {
    set({ ...state, sending: false });
    toast(result.error, "error");
    return false;
  }
  const next: SelectionState = {
    ...state,
    sending: false,
    note: current.note.trim(),
    submitted: { photoIds: current.picked, note: current.note.trim(), submittedAt: new Date().toISOString() },
  };
  saveDraft(next);
  set(next);
  toast("Đã gửi danh sách ảnh cho studio");
  return true;
}
