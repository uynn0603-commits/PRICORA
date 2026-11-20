"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/format";
import { confirmDialog, toast } from "@/lib/overlay";
import { albumUrl, clearSelection, currentStudio, updateAlbum } from "@/lib/store";
import { editDone, type Album } from "@/lib/types";
import { ui } from "@/lib/ui";

function sentAt(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ngày ${date.toLocaleDateString("vi-VN")}`;
}

// "" shows every photo; the others narrow the grid to one of the client's lists.
export type SelectionFilter = "" | "favorite" | "edit";

function clientLists(album: Album) {
  const ids = new Set(album.selection?.photoIds || []);
  const requests = album.selection?.photoNotes || {};
  return {
    favorites: album.photos.filter((photo) => ids.has(photo.id)).map((photo) => photo.name),
    edits: album.photos
      .filter((photo) => requests[photo.id])
      .map((photo) => ({ name: photo.name, request: requests[photo.id], done: editDone(album.selection?.photoEdits, photo.id, requests[photo.id]) })),
  };
}

// Ready to paste into Zalo/Messenger: there is no email or SMS, the client is told by the studio.
function doneMessage(album: Album, done: number, total: number): string {
  const name = album.customerName || "bạn";
  const studio = currentStudio()?.name || "Studio";
  const rest = total - done;
  return [
    `Chào ${name}, ${studio} đã sửa xong ${done} ảnh theo yêu cầu của bạn${rest > 0 ? ` (còn ${rest} ảnh đang sửa)` : ""}.`,
    `Bạn xem lại tại: ${albumUrl(album)}`,
    "Ảnh đã sửa có nhãn “Đã sửa”. Nếu chưa ưng ảnh nào, bạn sửa lại yêu cầu ở ảnh đó rồi bấm Gửi lại cho studio nhé.",
  ].join("\n");
}

// What the client sent from the public gallery, and the studio's tools for working with it.
export function SelectionPanel({ album, filter, onFilter }: { album: Album; filter: SelectionFilter; onFilter: (value: SelectionFilter) => void }) {
  const selection = album.selection;
  if (!album.selectionEnabled && !selection) return null;

  if (!selection) {
    return (
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-line bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-canvas text-mist">
            <Icon name="notebook-pen" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Khách chưa gửi lựa chọn</p>
            <p className="text-xs text-mist">
              Khách mở album, chạm trái tim để chọn ảnh yêu thích{album.selectionLimit ? ` (tối đa ${album.selectionLimit} ảnh)` : ""}, chạm biểu tượng ghi chú để yêu cầu sửa, rồi bấm “Gửi cho studio”.
            </p>
          </div>
        </div>
        <Link href={`/admin/albums/${album.id}/share`} className={ui.secondary}>
          <Icon name="share-2" className="h-4 w-4" /> Gửi liên kết cho khách
        </Link>
      </div>
    );
  }

  const { favorites, edits } = clientLists(album);
  const doneCount = edits.filter((edit) => edit.done).length;
  const missing = selection.photoIds.length - favorites.length;
  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(doneMessage(album, doneCount, edits.length));
      toast("Đã sao chép tin nhắn, dán vào Zalo để gửi cho khách");
    } catch {
      toast("Trình duyệt không cho phép sao chép.", "error");
    }
  };
  // Copies the list on screen; with no filter, the favourites (what usually goes to print).
  const copied = filter === "edit" ? edits.map((edit) => edit.name) : favorites;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copied.join("\n"));
      toast(`Đã sao chép ${copied.length} tên tệp`);
    } catch {
      toast("Trình duyệt không cho phép sao chép.", "error");
    }
  };
  const download = () => {
    const lines = [
      `Album: ${album.name}`,
      `Khách hàng: ${album.customerName}`,
      `Gửi lúc: ${sentAt(selection.submittedAt)}`,
      ...(selection.note ? ["", "Ghi chú chung:", selection.note] : []),
      "",
      `ẢNH YÊU THÍCH (${favorites.length})`,
      ...favorites,
      "",
      `ẢNH CẦN SỬA (${edits.length}, đã sửa ${doneCount})`,
      ...edits.map((edit) => `${edit.done ? "[Đã sửa] " : ""}${edit.name}\t${edit.request.replace(/\s*\n\s*/g, " / ")}`),
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
    onFilter("");
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
              {album.customerName || "Khách"}: {favorites.length}
              {album.selectionLimit ? `/${album.selectionLimit}` : ""} ảnh yêu thích · {edits.length} ảnh cần sửa
              {edits.length ? <span className="font-normal text-mist"> (đã sửa {doneCount}/{edits.length})</span> : null}
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
          {doneCount ? (
            <button type="button" onClick={() => void copyMessage()} className={cn(ui.secondary, "border-emerald-200 text-emerald-700 hover:bg-emerald-50")}>
              <Icon name="send" className="h-4 w-4" /> Sao chép tin nhắn báo khách
            </button>
          ) : null}
          <button type="button" onClick={() => void copy()} className={ui.secondary} disabled={!copied.length}>
            <Icon name="copy" className="h-4 w-4" /> {filter === "edit" ? "Sao chép tên ảnh cần sửa" : "Sao chép tên ảnh yêu thích"}
          </button>
          <button type="button" onClick={download} className={ui.secondary}>
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
      <div className="mt-3 inline-flex rounded-xl border border-line bg-canvas p-1 text-sm font-semibold" role="group" aria-label="Lọc ảnh">
        {(
          [
            ["", "Tất cả ảnh", "images", album.photos.length],
            ["favorite", "Yêu thích", "heart", favorites.length],
            ["edit", "Cần sửa", "notebook-pen", edits.length],
          ] as const
        ).map(([value, label, icon, total]) => (
          <button
            key={value || "all"}
            type="button"
            onClick={() => onFilter(value)}
            aria-pressed={filter === value}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg px-3",
              filter === value ? "bg-white text-ink shadow-sm" : "text-mist hover:text-ink",
            )}
          >
            <Icon name={icon} className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
            <span className="tabular-nums">{total}</span>
          </button>
        ))}
      </div>
      {selection.note ? (
        <p className="mt-3 whitespace-pre-line rounded-xl [overflow-wrap:anywhere] bg-canvas px-4 py-3 text-sm leading-relaxed text-ink">
          <span className="mb-1 block text-xs font-semibold text-mist">Ghi chú chung của khách</span>
          {selection.note}
        </p>
      ) : null}
    </div>
  );
}
