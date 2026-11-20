"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/format";
import { confirmDialog, toast } from "@/lib/overlay";
import { clearSelection, updateAlbum } from "@/lib/store";
import type { Album } from "@/lib/types";
import { ui } from "@/lib/ui";

function sentAt(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ngày ${date.toLocaleDateString("vi-VN")}`;
}

function pickedNames(album: Album): string[] {
  const ids = new Set(album.selection?.photoIds || []);
  return album.photos.filter((photo) => ids.has(photo.id)).map((photo) => photo.name);
}

// What the client picked in the public gallery, and the studio's tools for working with it.
export function SelectionPanel({ album, filtered, onFilter }: { album: Album; filtered: boolean; onFilter: (value: boolean) => void }) {
  const selection = album.selection;
  if (!album.selectionEnabled && !selection) return null;

  if (!selection) {
    return (
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-line bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-canvas text-mist">
            <Icon name="heart" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Khách chưa gửi lựa chọn</p>
            <p className="text-xs text-mist">
              Khách mở album, thả tim các ảnh muốn chọn{album.selectionLimit ? ` (tối đa ${album.selectionLimit} ảnh)` : ""} rồi bấm “Gửi cho studio”.
            </p>
          </div>
        </div>
        <Link href={`/admin/albums/${album.id}/share`} className={ui.secondary}>
          <Icon name="share-2" className="h-4 w-4" /> Gửi liên kết cho khách
        </Link>
      </div>
    );
  }

  const names = pickedNames(album);
  const missing = selection.photoIds.length - names.length;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(names.join("\n"));
      toast(`Đã sao chép ${names.length} tên tệp`);
    } catch {
      toast("Trình duyệt không cho phép sao chép.", "error");
    }
  };
  const download = () => {
    const lines = [
      `Album: ${album.name}`,
      `Khách hàng: ${album.customerName}`,
      `Gửi lúc: ${sentAt(selection.submittedAt)}`,
      `Số ảnh: ${names.length}`,
      ...(selection.note ? ["", "Ghi chú:", selection.note] : []),
      "",
      ...names,
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${album.slug}-anh-khach-chon.txt`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const toggleLock = () => {
    updateAlbum(album.id, { selectionLocked: !album.selectionLocked });
    toast(album.selectionLocked ? "Đã mở lại, khách có thể sửa lựa chọn" : "Đã chốt danh sách, khách không sửa được nữa");
  };
  const clear = async () => {
    const ok = await confirmDialog({
      title: "Xóa lựa chọn của khách?",
      message: "Danh sách ảnh và ghi chú khách đã gửi sẽ bị xóa. Ảnh trong album vẫn giữ nguyên.",
      confirmText: "Xóa lựa chọn",
      danger: true,
    });
    if (!ok) return;
    clearSelection(album.id);
    onFilter(false);
    toast("Đã xóa lựa chọn");
  };

  return (
    <div className="mt-4 rounded-2xl border border-line bg-white px-5 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-500">
            <Icon name="heart" className="h-5 w-5 fill-current" />
          </span>
          <div>
            <p className="text-sm font-semibold">
              {album.customerName || "Khách"} đã chọn {names.length}
              {album.selectionLimit ? `/${album.selectionLimit}` : ""} ảnh
              {album.selectionLocked ? (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink">
                  <Icon name="lock" className="h-3 w-3" /> Đã chốt
                </span>
              ) : null}
            </p>
            <p className="text-xs text-mist">
              Gửi lúc {sentAt(selection.submittedAt)}
              {missing > 0 ? ` · ${missing} ảnh đã bị xóa khỏi album` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onFilter(!filtered)} className={cn(ui.secondary, filtered && "border-primary text-primary")} aria-pressed={filtered}>
            <Icon name={filtered ? "images" : "heart"} className="h-4 w-4" /> {filtered ? "Hiện tất cả ảnh" : "Chỉ hiện ảnh khách chọn"}
          </button>
          <button type="button" onClick={() => void copy()} className={ui.secondary} disabled={!names.length}>
            <Icon name="copy" className="h-4 w-4" /> Sao chép tên tệp
          </button>
          <button type="button" onClick={download} className={ui.secondary} disabled={!names.length}>
            <Icon name="download" className="h-4 w-4" /> Tải danh sách
          </button>
          <button type="button" onClick={toggleLock} className={ui.secondary}>
            <Icon name="lock" className="h-4 w-4" /> {album.selectionLocked ? "Mở lại" : "Chốt danh sách"}
          </button>
          <button type="button" onClick={() => void clear()} className={cn(ui.secondary, "text-rose-600 hover:bg-rose-50")}>
            <Icon name="trash-2" className="h-4 w-4" /> Xóa
          </button>
        </div>
      </div>
      {selection.note ? (
        <p className="mt-3 whitespace-pre-line rounded-xl bg-canvas px-4 py-3 text-sm leading-relaxed text-ink">
          <span className="mb-1 block text-xs font-semibold text-mist">Ghi chú của khách</span>
          {selection.note}
        </p>
      ) : null}
    </div>
  );
}
