"use client";

import { useSyncExternalStore } from "react";
import { toast } from "@/lib/overlay";
import { submitSelection } from "@/lib/store";
import { editDone, PHOTO_NOTE_MAX, type AlbumSelection, type PhotoEdit } from "@/lib/types";

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
  // Favourites, in album order. The limit applies to these only.
  picked: string[];
  note: string;
  // Retouch requests on any photo, independent of the favourites.
  notes: Record<string, string>;
  // Photo whose note sheet is open, shared by the tiles and the lightbox.
  editing: string | null;
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

type Draft = { picked: string[]; note: string; notes: Record<string, string> };

// Unsent picks survive a reload or closing the tab, so a long album can be chosen over several visits.
function readDraft(albumId: string): Draft | null {
  try {
    const raw = JSON.parse(localStorage.getItem(draftKey(albumId)) || "null");
    if (!raw || !Array.isArray(raw.picked)) return null;
    const notes = raw.notes && typeof raw.notes === "object" ? raw.notes : {};
    return { picked: raw.picked.map(String), note: String(raw.note || ""), notes: Object.fromEntries(Object.entries(notes).map(([id, text]) => [id, String(text)])) };
  } catch {
    return null;
  }
}

function saveDraft(next: SelectionState) {
  try {
    if (!isDirty(next)) localStorage.removeItem(draftKey(next.albumId));
    else localStorage.setItem(draftKey(next.albumId), JSON.stringify({ picked: next.picked, note: next.note, notes: next.notes }));
  } catch {
    // Private mode: picks still work for this visit.
  }
}

function update(patch: Partial<SelectionState>) {
  if (!state) return;
  const next = { ...state, ...patch };
  saveDraft(next);
  set(next);
}

export function startSelection(config: SelectionConfig | null) {
  if (!config) {
    if (state) set(null);
    return;
  }
  const known = new Set(config.photoIds);
  const draft = config.locked ? null : readDraft(config.albumId);
  const picked = (draft?.picked || config.submitted?.photoIds || []).filter((id) => known.has(id));
  const source = draft?.notes || config.submitted?.photoNotes || {};
  const notes = Object.fromEntries(config.photoIds.filter((id) => source[id]).map((id) => [id, source[id]]));
  set({ ...config, picked, notes, note: draft?.note ?? config.submitted?.note ?? "", editing: null, sending: false });
}

// The studio answered requests since the page loaded: take the new answers without touching
// the client's unsent picks or an open note sheet.
export function refreshSubmitted(albumId: string, submitted: AlbumSelection | null) {
  if (state?.albumId === albumId && submitted && submitted.submittedAt === state.submitted?.submittedAt) set({ ...state, submitted });
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

function sameNotes(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((id) => a[id] === b[id]);
}

export function isDirty(current: SelectionState): boolean {
  const sent = current.submitted;
  if (!sent) return current.picked.length > 0 || Object.keys(current.notes).length > 0 || current.note.trim() !== "";
  if (sent.note !== current.note.trim() || sent.photoIds.length !== current.picked.length) return true;
  if (!sameNotes(sent.photoNotes || {}, current.notes)) return true;
  const ids = new Set(sent.photoIds);
  return current.picked.some((id) => !ids.has(id));
}

// The studio's answer to the client's current request for this photo. Rewriting the request
// (even before sending) hides it, and sending the new text reopens the photo for the studio.
export function studioEdit(current: SelectionState, photoId: string): PhotoEdit | null {
  return editDone(current.submitted?.photoEdits, photoId, current.notes[photoId]);
}

export function openNote(photoId: string) {
  if (!state) return;
  set({ ...state, editing: photoId });
}

export function closeNote() {
  if (state?.editing) set({ ...state, editing: null });
}

function blockedByLock(): boolean {
  if (!state?.locked) return false;
  toast("Studio đã chốt danh sách ảnh bạn chọn.", "info");
  return true;
}

export function toggleFavorite(photoId: string) {
  if (!state || blockedByLock()) return;
  if (state.picked.includes(photoId)) {
    update({ picked: state.picked.filter((id) => id !== photoId) });
    return;
  }
  if (state.limit && state.picked.length >= state.limit) {
    toast(`Bạn đã chọn đủ ${state.limit} ảnh yêu thích. Bỏ một ảnh để chọn ảnh khác.`, "info");
    return;
  }
  // Favourites keep album order so the studio reads them in the order they were shot.
  update({ picked: state.photoIds.filter((id) => id === photoId || state!.picked.includes(id)) });
}

// An empty text removes the request.
export function saveRequest(photoId: string, text: string) {
  if (!state || blockedByLock()) return;
  const notes = { ...state.notes };
  const clean = text.trim().slice(0, PHOTO_NOTE_MAX);
  if (clean) notes[photoId] = clean;
  else delete notes[photoId];
  update({ notes, editing: null });
}

export function removeRequest(photoId: string) {
  saveRequest(photoId, "");
}

export function setSelectionNote(note: string) {
  if (!state) return;
  update({ note: note.slice(0, 2000) });
}

export async function sendSelection(): Promise<boolean> {
  if (!state || state.sending) return false;
  if (state.preview) {
    toast("Đây là chế độ xem trước. Khách hàng sẽ gửi lựa chọn từ đường dẫn album.", "info");
    return false;
  }
  if (!state.picked.length && !Object.keys(state.notes).length) {
    toast("Hãy chọn ít nhất một ảnh yêu thích hoặc ghi một yêu cầu sửa.", "info");
    return false;
  }
  const current = state;
  set({ ...current, sending: true });
  const result = await submitSelection(current.studioSlug, current.albumSlug, {
    photoIds: current.picked,
    note: current.note.trim(),
    photoNotes: current.notes,
  });
  if (!state || state.albumId !== current.albumId) return result.ok;
  if (!result.ok) {
    set({ ...state, sending: false });
    toast(result.error, "error");
    return false;
  }
  const next: SelectionState = { ...state, sending: false, note: result.selection.note, notes: result.selection.photoNotes, submitted: result.selection };
  saveDraft(next);
  set(next);
  toast("Đã gửi cho studio");
  return true;
}
