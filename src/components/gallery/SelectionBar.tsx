"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/format";
import { photoSrc } from "@/lib/media";
import { PHOTO_NOTE_MAX, type Photo } from "@/lib/types";
import { ui } from "@/lib/ui";
import { Icon } from "../ui/Icon";
import {
  closeNote,
  isDirty,
  openNote,
  removeRequest,
  saveRequest,
  sendSelection,
  setSelectionNote,
  studioEdit,
  toggleFavorite,
  useSelection,
} from "./selection";

function sentAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${time} ${date.toLocaleDateString("vi-VN")}`;
}

// Common requests a client can tap instead of typing on a phone keyboard.
const QUICK_REQUESTS = ["Chỉnh da", "Làm sáng", "Xóa vật thừa", "Chỉnh dáng", "Chỉnh màu", "In ảnh"];

const tileButton = "grid h-10 w-10 place-items-center rounded-full transition-colors";

// Heart (one tap, favourite) and note (retouch request) laid over a photo tile.
// Renders nothing when the album has no client selection.
export function PickButton({ photoId, className = "" }: { photoId: string; className?: string }) {
  const selection = useSelection();
  if (!selection) return null;
  const favorite = selection.picked.includes(photoId);
  const noted = Boolean(selection.notes[photoId]);
  const done = Boolean(studioEdit(selection, photoId));
  return (
    <span className={cn("absolute right-2 top-2 z-10 flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={() => toggleFavorite(photoId)}
        aria-pressed={favorite}
        aria-label={favorite ? "Bỏ yêu thích" : "Yêu thích"}
        title={favorite ? "Bỏ yêu thích" : "Yêu thích"}
        className={cn(tileButton, favorite ? "bg-white text-rose-500 shadow-sm" : "bg-black/40 text-white hover:bg-black/60")}
      >
        <Icon name="heart" className={cn("h-[18px] w-[18px]", favorite && "fill-current")} />
      </button>
      <button
        type="button"
        onClick={() => openNote(photoId)}
        aria-label={done ? "Studio đã sửa, xem lại" : noted ? "Xem yêu cầu sửa" : "Yêu cầu sửa ảnh này"}
        title={done ? "Đã sửa" : noted ? "Có yêu cầu sửa" : "Yêu cầu sửa"}
        className={cn(
          tileButton,
          "relative",
          done ? "bg-white text-emerald-600 shadow-sm" : noted ? "bg-white text-amber-600 shadow-sm" : "bg-black/40 text-white hover:bg-black/60",
        )}
      >
        <Icon name="notebook-pen" className="h-[18px] w-[18px]" />
        {done ? (
          <span className="absolute -bottom-0.5 -right-0.5 grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-white bg-emerald-500 text-white">
            <Icon name="check" className="h-2.5 w-2.5 stroke-[3.5]" />
          </span>
        ) : noted ? (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-amber-500" aria-hidden />
        ) : null}
      </button>
      {done ? (
        <span className="pointer-events-none -mt-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-white">Đã sửa</span>
      ) : null}
    </span>
  );
}

// Bottom sheet on phones, centred dialog on larger screens.
function NoteSheet({ photos }: { photos: Photo[] }) {
  const selection = useSelection();
  const photoId = selection?.editing || null;
  const [text, setText] = useState("");

  useEffect(() => {
    if (photoId) setText(selection?.notes[photoId] || "");
    // Load the saved request only when another photo opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoId]);

  useEffect(() => {
    if (!photoId) return;
    // Capture phase, so Escape closes the sheet without also closing the lightbox under it.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      closeNote();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [photoId]);

  if (!selection || !photoId) return null;
  const index = photos.findIndex((photo) => photo.id === photoId);
  const photo = photos[index];
  if (!photo) return null;
  const saved = selection.notes[photoId] || "";
  const done = studioEdit(selection, photoId);
  const { locked } = selection;
  const addQuick = (label: string) => {
    setText((current) => {
      const base = current.trim().replace(/[,.]$/, "");
      return (base ? `${base}, ${label.toLowerCase()}` : label).slice(0, PHOTO_NOTE_MAX);
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 font-jakarta sm:items-center sm:px-4" onClick={closeNote}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-title"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92svh] w-full overflow-y-auto rounded-t-2xl bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 text-[#191827] sm:max-w-md sm:rounded-2xl sm:p-6"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15 sm:hidden" aria-hidden />
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoSrc(photo, 240, 1)} alt="" className="h-14 w-14 shrink-0 rounded-lg bg-[#F1F0F5] object-cover" />
          <div className="min-w-0 flex-1">
            <p id="note-title" className="font-semibold">
              Ảnh {index + 1}/{photos.length}
            </p>
            <p className="truncate text-xs text-[#77758A]">{photo.name}</p>
          </div>
          <button type="button" onClick={closeNote} className="-mr-2 grid h-11 w-11 place-items-center rounded-full text-[#77758A] hover:bg-black/5" aria-label="Đóng">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-[#191827]">
            <p className="flex items-center gap-1.5 font-semibold text-emerald-700">
              <Icon name="circle-check" className="h-4 w-4" /> Studio đã sửa xong · {sentAt(done.doneAt)}
            </p>
            {done.reply ? <p className="mt-1 whitespace-pre-line [overflow-wrap:anywhere]">“{done.reply}”</p> : null}
            {!locked ? <p className="mt-1.5 text-xs text-[#46445A]">Chưa ưng? Sửa lại yêu cầu bên dưới, lưu rồi bấm Gửi lại cho studio.</p> : null}
          </div>
        ) : null}
        {locked ? (
          <div className="mt-4 rounded-xl bg-[#F6F5FA] px-4 py-3 text-sm">
            <p className="font-medium">{saved ? "Yêu cầu chỉnh sửa" : "Ảnh không có yêu cầu sửa"}</p>
            {saved ? <p className="mt-1 whitespace-pre-line text-[#46445A] [overflow-wrap:anywhere]">{saved}</p> : null}
            <p className="mt-2 text-xs text-[#77758A]">Studio đã chốt danh sách. Liên hệ studio nếu cần thay đổi.</p>
          </div>
        ) : (
          <>
            <label className="mt-4 block">
              <span className="block text-sm font-medium">Bạn muốn studio sửa gì ở ảnh này?</span>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value.slice(0, PHOTO_NOTE_MAX))}
                rows={3}
                maxLength={PHOTO_NOTE_MAX}
                placeholder="Ví dụ: làm sáng mặt, xóa người phía sau..."
                className={cn(ui.input, "mt-1.5 h-auto py-3 text-base sm:text-sm")}
              />
            </label>
            <div className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
              {QUICK_REQUESTS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => addQuick(label)}
                  className="h-9 shrink-0 rounded-full border border-black/10 px-3.5 text-sm text-[#46445A] active:bg-black/5"
                >
                  + {label}
                </button>
              ))}
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {saved ? (
                <button type="button" onClick={() => removeRequest(photoId)} className={cn(ui.secondary, "h-12 text-rose-600 sm:h-10")}>
                  Xóa yêu cầu
                </button>
              ) : null}
              <button type="button" disabled={!text.trim() && !saved} onClick={() => saveRequest(photoId, text)} className={cn(ui.primary, "h-12 sm:h-10")}>
                <Icon name="check" className="h-4 w-4" />
                Lưu yêu cầu
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

// Fixed bar at the bottom of the gallery: count, review and submit.
export function SelectionBar({ photos, onReview }: { photos: Photo[]; onReview: (photoIds: string[]) => void }) {
  const selection = useSelection();
  const [composing, setComposing] = useState(false);
  const shown = Boolean(selection);

  // Toasts sit above the bar instead of covering its buttons.
  useEffect(() => {
    if (!shown) return;
    document.documentElement.style.setProperty("--toast-offset", "72px");
    return () => {
      document.documentElement.style.removeProperty("--toast-offset");
    };
  }, [shown]);

  if (!selection) return null;
  const { picked, limit, locked, submitted, preview, sending } = selection;
  const dirty = isDirty(selection);
  const count = limit ? `${picked.length}/${limit}` : String(picked.length);
  const requests = Object.keys(selection.notes).length;
  const any = picked.length > 0 || requests > 0;
  // Review shows both lists together, in album order.
  const marked = selection.photoIds.filter((id) => picked.includes(id) || selection.notes[id]);
  const summary = [picked.length ? `${picked.length} ảnh yêu thích` : "", requests ? `${requests} ảnh cần sửa` : ""].filter(Boolean).join(", ");

  const doneCount = Object.keys(selection.notes).filter((id) => studioEdit(selection, id)).length;

  let status = "Chạm trái tim để chọn ảnh yêu thích, biểu tượng ghi chú để yêu cầu sửa.";
  if (submitted && dirty) status = "Có thay đổi chưa gửi.";
  else if (doneCount) status = `Studio đã sửa xong ${doneCount}/${requests} ảnh bạn yêu cầu.`;
  else if (locked) status = "Studio đã chốt danh sách. Liên hệ studio nếu cần thay đổi.";
  else if (submitted) status = `Đã gửi lúc ${sentAt(submitted.submittedAt)}`;
  else if (any) status = "Chưa gửi cho studio.";
  const doneNotice = doneCount > 0 && !(submitted && dirty);

  return (
    <>
      <div aria-hidden className="h-20" />
      {createPortal(
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-black/10 bg-white pb-[env(safe-area-inset-bottom)] font-jakarta text-[#191827]">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-3 text-sm font-semibold tabular-nums">
                <span className="inline-flex items-center gap-1.5" title="Ảnh yêu thích">
                  <Icon name="heart" className={cn("h-4 w-4 text-rose-500", picked.length > 0 && "fill-current")} />
                  <span>
                    {count}
                    <span className="hidden font-normal text-[#77758A] sm:inline"> yêu thích</span>
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5" title="Ảnh cần sửa">
                  <Icon name="notebook-pen" className="h-4 w-4 text-amber-600" />
                  <span>
                    {requests}
                    <span className="hidden font-normal text-[#77758A] sm:inline"> cần sửa</span>
                  </span>
                </span>
                {preview ? <span className="hidden font-normal text-[#77758A] sm:inline">· Xem trước của studio</span> : null}
              </p>
              <p className={cn("truncate text-xs", doneNotice ? "font-semibold text-emerald-700" : "text-[#77758A]")}>{status}</p>
            </div>
            <button
              type="button"
              onClick={() => onReview(marked)}
              disabled={!marked.length}
              className={cn(ui.secondary, "h-11 px-3 sm:h-10 sm:px-4")}
              aria-label="Xem ảnh đã chọn"
            >
              <Icon name="images" className="h-5 w-5 sm:hidden" />
              <span className="hidden sm:inline">Xem ảnh đã chọn</span>
            </button>
            {!locked && (
              <button
                type="button"
                onClick={() => setComposing(true)}
                disabled={!any || (!dirty && Boolean(submitted))}
                className={cn(ui.primary, "h-11 sm:h-10")}
              >
                <Icon name="send" className="h-4 w-4" />
                <span className="hidden sm:inline">{submitted ? "Gửi lại" : "Gửi cho studio"}</span>
                <span className="sm:hidden">Gửi</span>
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
      <NoteSheet photos={photos} />
      {composing &&
        createPortal(
          <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/50 font-jakarta sm:items-center sm:px-4" onClick={() => setComposing(false)}>
            <div
              className="w-full rounded-t-2xl bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 text-[#191827] sm:max-w-md sm:rounded-2xl sm:p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="selection-title"
              onClick={(event) => event.stopPropagation()}
            >
              <p id="selection-title" className="text-lg font-semibold">
                Gửi cho studio
              </p>
              <p className="mt-1 text-sm text-[#77758A]">
                {summary}. {submitted ? "Danh sách mới sẽ thay cho lần gửi trước." : "Studio sẽ nhận được danh sách và ghi chú của bạn."}
                {limit && picked.length < limit ? ` Bạn còn có thể chọn thêm ${limit - picked.length} ảnh yêu thích.` : ""}
              </p>
              <label className="mt-5 block">
                <span className={ui.label}>Ghi chú chung cho studio (không bắt buộc)</span>
                <textarea
                  value={selection.note}
                  onChange={(event) => setSelectionNote(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Ví dụ: tông màu ấm cho cả bộ, cần gấp trước ngày 20..."
                  className={cn(ui.input, "h-auto py-3 text-base sm:text-sm")}
                />
              </label>
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setComposing(false)} className={cn(ui.secondary, "h-12 sm:h-10")}>
                  Để sau
                </button>
                <button
                  type="button"
                  disabled={sending}
                  onClick={async () => {
                    if (await sendSelection()) setComposing(false);
                  }}
                  className={cn(ui.primary, "h-12 sm:h-10")}
                >
                  {sending ? "Đang gửi..." : "Gửi cho studio"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
