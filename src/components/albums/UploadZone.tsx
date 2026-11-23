"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/format";
import { ui } from "@/lib/ui";
import { Icon } from "@/components/ui/Icon";

export interface UploadItem {
  key: string;
  name: string;
  status: "queued" | "uploading" | "success" | "failed";
  progress: number;
  error: string;
  retryable: boolean;
}

export function UploadRow({ item, onRetry }: { item: UploadItem; onRetry?: (key: string) => void }) {
  const width = Math.round((item.progress || 0) * 100);
  const tone =
    item.status === "failed" ? "text-rose-600" : item.status === "success" ? "text-emerald-600" : item.status === "queued" ? "text-mist" : "text-primary";
  const label =
    item.status === "failed"
      ? item.error
      : item.status === "success"
        ? "Đã tải lên"
        : item.status === "queued"
          ? "Đang chờ"
          : `Đang tải ${width}%`;
  return (
    <li className="rounded-xl border border-line bg-white px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium">{item.name}</p>
        <div className="flex shrink-0 items-center gap-3">
          <p className={cn("min-w-0 truncate text-xs font-semibold", tone)}>{label}</p>
          {item.status === "failed" && item.retryable && onRetry ? (
            <button type="button" onClick={() => onRetry(item.key)} className="text-xs font-semibold text-primary hover:underline">
              Thử lại
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className={cn("h-full rounded-full", item.status === "failed" ? "bg-rose-500" : "bg-primary")}
          style={{ width: `${item.status === "failed" ? 100 : width}%` }}
        />
      </div>
    </li>
  );
}

function UploadQueue({ queue, onClear, onRetry }: { queue: UploadItem[]; onClear: () => void; onRetry: (key: string) => void }) {
  if (!queue.length) return <ul className="mt-3 space-y-2" />;
  const done = queue.filter((item) => item.status === "success").length;
  const failed = queue.filter((item) => item.status === "failed").length;
  const retryable = queue.filter((item) => item.status === "failed" && item.retryable);
  const settled = done + failed === queue.length;
  return (
    <ul className="mt-3 space-y-2">
      <li className="flex items-center justify-between px-1 pt-1 text-xs text-mist">
        <span>
          Đã tải {done}/{queue.length}
          {failed ? ` · ${failed} lỗi` : ""}
        </span>
        <span className="flex gap-4">
          {retryable.length > 1 ? (
            <button type="button" onClick={() => retryable.forEach((item) => onRetry(item.key))} className="font-semibold text-primary">
              Thử lại {retryable.length} ảnh lỗi
            </button>
          ) : null}
          {settled ? (
            <button type="button" onClick={onClear} className="font-semibold text-primary">
              Xóa danh sách
            </button>
          ) : null}
        </span>
      </li>
      {queue.map((item) => (
        <UploadRow key={item.key} item={item} onRetry={onRetry} />
      ))}
    </ul>
  );
}

export function UploadZone({
  queue,
  onFiles,
  onClearQueue,
  onRetry,
}: {
  queue: UploadItem[];
  onFiles: (files: FileList | null | undefined) => Promise<void>;
  onClearQueue: () => void;
  onRetry: (key: string) => void;
}) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <div
        className={cn("rounded-2xl border border-dashed border-line bg-white px-6 py-10 text-center transition", over && "border-primary bg-primary/5")}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          void onFiles(event.dataTransfer?.files);
        }}
      >
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon name="upload" className="h-5 w-5" />
        </div>
        <p className="mt-4 text-base font-semibold">Kéo thả ảnh vào đây</p>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-mist">
          JPG, JPEG, PNG hoặc WEBP, tối đa 60 MB mỗi ảnh. Chọn bao nhiêu ảnh tùy ý.
        </p>
        <label className={cn(ui.primary, "mt-5 cursor-pointer")}>
          <input
            ref={input}
            type="file"
            className="sr-only"
            multiple
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            onChange={async (event) => {
              await onFiles(event.currentTarget.files);
              if (input.current) input.current.value = "";
            }}
          />
          <Icon name="image-plus" className="h-4 w-4" /> Tải ảnh lên
        </label>
      </div>
      <UploadQueue queue={queue} onClear={onClearQueue} onRetry={onRetry} />
    </>
  );
}
