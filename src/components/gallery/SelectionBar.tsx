"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/format";
import { ui } from "@/lib/ui";
import { Icon } from "../ui/Icon";
import { isDirty, sendSelection, setSelectionNote, togglePick, useSelection } from "./selection";

function sentAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${time} ${date.toLocaleDateString("vi-VN")}`;
}

// Heart toggle laid over a photo tile. Renders nothing when the album has no client selection.
export function PickButton({ photoId, className = "" }: { photoId: string; className?: string }) {
  const selection = useSelection();
  if (!selection) return null;
  const picked = selection.picked.includes(photoId);
  return (
    <button
      type="button"
      onClick={() => togglePick(photoId)}
      aria-pressed={picked}
      aria-label={picked ? "Bỏ chọn ảnh" : "Chọn ảnh này"}
      title={picked ? "Bỏ chọn" : "Chọn ảnh"}
      className={cn(
        "absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full transition-colors",
        picked ? "bg-white text-rose-500 shadow-sm" : "bg-black/35 text-white hover:bg-black/55",
        className,
      )}
    >
      <Icon name="heart" className={cn("h-[18px] w-[18px]", picked && "fill-current")} />
    </button>
  );
}

// Fixed bar at the bottom of the gallery: count, review and submit.
export function SelectionBar({ onReview }: { onReview: (photoIds: string[]) => void }) {
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

  let status = "Nhấn biểu tượng trái tim trên ảnh để chọn.";
  if (locked) status = "Studio đã chốt danh sách. Liên hệ studio nếu cần thay đổi.";
  else if (submitted && !dirty) status = `Đã gửi lúc ${sentAt(submitted.submittedAt)}`;
  else if (submitted) status = "Có thay đổi chưa gửi.";
  else if (picked.length) status = "Chưa gửi cho studio.";

  return (
    <>
      <div aria-hidden className="h-20" />
      {createPortal(
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-black/10 bg-white text-[#191827] font-jakarta">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-500">
              <Icon name="heart" className="h-5 w-5 fill-current" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                Đã chọn {count} ảnh
                {preview ? <span className="ml-2 font-normal text-[#77758A]">· Xem trước của studio</span> : null}
              </p>
              <p className="truncate text-xs text-[#77758A]">{status}</p>
            </div>
            <button type="button" onClick={() => onReview(picked)} disabled={!picked.length} className={ui.secondary} aria-label="Xem ảnh đã chọn">
              <Icon name="images" className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Xem ảnh đã chọn</span>
            </button>
            {!locked && (
              <button type="button" onClick={() => setComposing(true)} disabled={!picked.length || (!dirty && Boolean(submitted))} className={ui.primary}>
                <Icon name="send" className="h-4 w-4" />
                <span className="hidden sm:inline">{submitted ? "Gửi lại" : "Gửi cho studio"}</span>
                <span className="sm:hidden">Gửi</span>
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
      {composing &&
        createPortal(
          <div className="fixed inset-0 z-[75] grid place-items-center bg-black/50 px-4 font-jakarta" onClick={() => setComposing(false)}>
            <div
              className="w-full max-w-md rounded-2xl bg-white p-6 text-[#191827]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="selection-title"
              onClick={(event) => event.stopPropagation()}
            >
              <p id="selection-title" className="text-lg font-semibold">
                Gửi {picked.length} ảnh đã chọn
              </p>
              <p className="mt-1 text-sm text-[#77758A]">
                {submitted ? "Danh sách mới sẽ thay cho lần gửi trước." : "Studio sẽ nhận được danh sách và ghi chú của bạn."}
                {limit && picked.length < limit ? ` Bạn còn có thể chọn thêm ${limit - picked.length} ảnh.` : ""}
              </p>
              <label className="mt-5 block">
                <span className={ui.label}>Ghi chú cho studio (không bắt buộc)</span>
                <textarea
                  value={selection.note}
                  onChange={(event) => setSelectionNote(event.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Ví dụ: chỉnh da nhẹ, ảnh số 12 in khổ lớn..."
                  className={cn(ui.input, "h-auto py-3")}
                />
              </label>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setComposing(false)} className={ui.secondary}>
                  Để sau
                </button>
                <button
                  type="button"
                  disabled={sending}
                  onClick={async () => {
                    if (await sendSelection()) setComposing(false);
                  }}
                  className={ui.primary}
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
