"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn, formatBytes } from "@/lib/format";
import { photoSrc } from "@/lib/media";
import { toast } from "@/lib/overlay";
import { markEditDone, replacePhotoFile } from "@/lib/store";
import { EDIT_REPLY_MAX, type Album } from "@/lib/types";
import { ui } from "@/lib/ui";

// Studio answers one retouch request: optionally swaps in the retouched file, leaves a
// reply for the client, and marks the request done.
export function EditDoneDialog({ album, photoId, onClose }: { album: Album; photoId: string; onClose: () => void }) {
  const photo = album.photos.find((item) => item.id === photoId);
  const request = album.selection?.photoNotes[photoId] || "";
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [reply, setReply] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const busy = progress !== null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  if (!photo || !request) return null;

  const submit = async () => {
    setProgress(0);
    if (file) {
      const replaced = await replacePhotoFile(album.id, photoId, file, setProgress);
      if (!replaced.ok) {
        setProgress(null);
        return toast(replaced.error, "error");
      }
    }
    const result = await markEditDone(album.id, photoId, reply, Boolean(file));
    setProgress(null);
    if (!result.ok) return toast(file ? `Đã thay ảnh nhưng chưa đánh dấu được: ${result.error}` : result.error, "error");
    toast(file ? "Đã thay ảnh và đánh dấu đã sửa" : "Đã đánh dấu đã sửa");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[75] grid place-items-center bg-ink/40 px-4" onClick={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <div className="max-h-[92svh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6" role="dialog" aria-modal="true" aria-labelledby="edit-done-title">
        <div className="flex items-start justify-between gap-4">
          <h2 id="edit-done-title" className="text-lg font-semibold tracking-tight">
            Đánh dấu đã sửa
          </h2>
          <button type="button" onClick={onClose} disabled={busy} className="grid h-8 w-8 place-items-center rounded-lg text-mist hover:bg-canvas" aria-label="Đóng">
            <Icon name="x" />
          </button>
        </div>

        <div className="mt-4 flex gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoSrc(photo, 240, 1)} alt="" className="h-16 w-16 shrink-0 rounded-lg bg-canvas object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{photo.name}</p>
            <p className="mt-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[13px] leading-snug text-ink [overflow-wrap:anywhere]">
              <span className="block text-[11px] font-semibold text-amber-700">Khách yêu cầu</span>
              {request}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <span className={ui.label}>Ảnh đã sửa (không bắt buộc)</span>
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="flex w-full items-center gap-3 rounded-xl border border-dashed border-line px-4 py-3 text-left hover:bg-canvas"
          >
            <Icon name={file ? "image" : "upload"} className="h-5 w-5 shrink-0 text-mist" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{file ? file.name : "Chọn tệp để thay ảnh gốc"}</span>
              <span className="block text-xs text-mist">
                {file ? formatBytes(file.size) : "Khách sẽ thấy ngay bản mới ở đúng vị trí cũ. Ảnh gốc bị thay thế."}
              </span>
            </span>
            {file && !busy ? (
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  setFile(null);
                }}
                className="text-xs font-semibold text-mist hover:text-ink"
              >
                Bỏ
              </span>
            ) : null}
          </button>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              event.target.value = "";
            }}
          />
          {busy && file ? (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((progress || 0) * 100)}%` }} />
            </div>
          ) : null}
        </div>

        <label className="mt-4 block">
          <span className={ui.label}>Lời nhắn cho khách (không bắt buộc)</span>
          <textarea
            value={reply}
            onChange={(event) => setReply(event.target.value.slice(0, EDIT_REPLY_MAX))}
            rows={3}
            maxLength={EDIT_REPLY_MAX}
            placeholder="Ví dụ: đã chỉnh tông ấm hơn, bạn xem lại nhé."
            className={cn(ui.input, "h-auto py-3")}
          />
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={ui.secondary}>
            Hủy
          </button>
          <button type="button" onClick={() => void submit()} disabled={busy} className={ui.primary}>
            <Icon name="check" className="h-4 w-4" />
            {busy ? (file ? `Đang tải lên ${Math.round((progress || 0) * 100)}%` : "Đang lưu...") : "Đã sửa xong"}
          </button>
        </div>
      </div>
    </div>
  );
}
