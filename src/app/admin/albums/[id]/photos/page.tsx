"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { AlbumNotFound } from "@/components/albums/AlbumNotFound";
import { EditDoneDialog } from "@/components/albums/EditDoneDialog";
import { PhotoCard } from "@/components/albums/PhotoCard";
import { SelectionPanel, type SelectionFilter } from "@/components/albums/SelectionPanel";
import { UploadZone, type UploadItem } from "@/components/albums/UploadZone";
import { openLightbox } from "@/components/gallery/PhotoLightbox";
import { Icon } from "@/components/ui/Icon";
import { cn, plural } from "@/lib/format";
import { photoSrc } from "@/lib/media";
import { confirmDialog, toast } from "@/lib/overlay";
import {
  addPhotos,
  deletePhotos,
  galleryPath,
  getAlbum,
  movePhoto,
  refreshSelection,
  reorderPhotos,
  setCover,
  setMobileCover,
  sortPhotos,
  undoEditDone,
  uploadsInFlight,
  type SortMode,
  type UploadEntry,
} from "@/lib/store";
import { editDone } from "@/lib/types";
import { ui } from "@/lib/ui";
import { useStore, useTitle } from "@/lib/use-store";

let uploadSeq = 0;

export default function PhotosPage() {
  useStore();
  const { id } = useParams<{ id: string }>();
  const album = getAlbum(id);
  useTitle(`${album?.name || "Ảnh"} · PICORA`);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const pickedParam = useSearchParams().get("picked");
  const filterParam: SelectionFilter = pickedParam === "edit" ? "edit" : pickedParam ? "favorite" : "";
  const [selectionFilter, setSelectionFilter] = useState<SelectionFilter>(filterParam);
  const [editing, setEditing] = useState<string | null>(null);
  const files = useRef(new Map<string, File>());

  useEffect(() => {
    if (filterParam) setSelectionFilter(filterParam);
  }, [filterParam]);

  useEffect(() => {
    void refreshSelection(id);
    const onFocus = () => void refreshSelection(id);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [id]);
  const dragId = useRef("");
  const selectAll = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const prevent = (event: Event) => event.preventDefault();
    const leave = (event: BeforeUnloadEvent) => {
      if (uploadsInFlight()) event.preventDefault();
    };
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    window.addEventListener("beforeunload", leave);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
      window.removeEventListener("beforeunload", leave);
    };
  }, []);

  const total = album?.photos.length || 0;
  useEffect(() => {
    if (selectAll.current) selectAll.current.indeterminate = selected.size > 0 && selected.size < total;
  });

  if (!album) return <AlbumNotFound />;
  const albumId = album.id;
  const pickedIds = new Set(album.selection?.photoIds || []);
  const requests = album.selection?.photoNotes || {};
  const undoEdit = async (photoId: string) => {
    const result = await undoEditDone(albumId, photoId);
    if (!result.ok) toast(result.error, "error");
    else toast("Đã chuyển ảnh về “Cần sửa”");
  };
  const filtering = selectionFilter !== "" && Boolean(album.selection);
  const visible = !filtering
    ? album.photos
    : album.photos.filter((photo) => (selectionFilter === "edit" ? Boolean(requests[photo.id]) : pickedIds.has(photo.id)));

  const upload = (entries: UploadEntry[]) =>
    addPhotos(albumId, entries, (event) => {
      const row: UploadItem = {
        key: event.id,
        name: event.file.name,
        status: event.status,
        progress: event.progress || 0,
        error: event.error || "",
        retryable: Boolean(event.retryable),
      };
      if (event.status === "success") files.current.delete(event.id);
      setQueue((current) => {
        const index = current.findIndex((item) => item.key === event.id);
        if (index === -1) return [...current, row];
        return current.map((item, position) => (position === index ? row : item));
      });
    });

  const handleFiles = async (list: FileList | null | undefined) => {
    if (!list?.length) return;
    const entries = [...list].map((file) => ({ id: `upl-${++uploadSeq}`, file }));
    for (const entry of entries) files.current.set(entry.id, entry.file);
    await upload(entries);
  };

  const retryUpload = (key: string) => {
    const file = files.current.get(key);
    if (file) void upload([{ id: key, file }]);
  };

  const toggle = (photoId: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(photoId);
      else next.delete(photoId);
      return next;
    });
  };

  const preview = (photoId: string) => {
    const photos = visible.map((photo) => ({ ...photo, src: photoSrc(photo, 1800) }));
    const index = visible.findIndex((photo) => photo.id === photoId);
    openLightbox(photos, Math.max(0, index));
  };

  const deleteSelected = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    const ok = await confirmDialog({
      title: `Xóa ${ids.length} ảnh?`,
      message: "Ảnh và tệp gốc sẽ bị xóa vĩnh viễn khỏi kho lưu trữ, không thể khôi phục.",
      confirmText: "Xóa ảnh",
      danger: true,
    });
    if (!ok) return;
    deletePhotos(albumId, ids);
    setSelected(new Set());
    toast("Đã xóa ảnh");
  };

  const setSelectedCover = () => {
    const photoId = [...selected][0];
    if (!photoId) return;
    setCover(albumId, photoId);
    toast("Đã cập nhật ảnh bìa");
  };

  const toggleMobileCover = () => {
    const photoId = [...selected][0];
    if (!photoId) return;
    const clearing = album.mobileCoverId === photoId;
    setMobileCover(albumId, clearing ? "" : photoId);
    toast(clearing ? "Điện thoại sẽ dùng ảnh bìa chính" : "Đã đặt ảnh bìa cho điện thoại");
  };

  const onDragStart = (photoId: string, event: DragEvent<HTMLButtonElement>) => {
    dragId.current = photoId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", photoId);
  };

  const onDrop = (photoId: string, event: DragEvent<HTMLElement>) => {
    if (!dragId.current) return;
    event.preventDefault();
    const ids = album.photos.map((photo) => photo.id);
    const from = ids.indexOf(dragId.current);
    const to = ids.indexOf(photoId);
    if (from < 0 || to < 0 || from === to) return;
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    reorderPhotos(albumId, ids);
    dragId.current = "";
  };

  const one = selected.size === 1;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight md:text-[32px]">{album.name}</h1>
          <p className="mt-2 text-sm text-mist">
            {album.customerName && album.customerName !== album.name ? `${album.customerName} · ` : ""}
            <span>{plural(album.photos.length, "photo")}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/albums/${album.id}/share`} className={ui.secondary}>
            <Icon name="share-2" className="h-4 w-4" /> Chia sẻ
          </Link>
          <Link href={galleryPath(album)} className={ui.primary}>
            <Icon name="eye" className="h-4 w-4" /> Xem album
          </Link>
        </div>
      </div>
      <UploadZone
        queue={queue}
        onFiles={handleFiles}
        onRetry={retryUpload}
        onClearQueue={() => {
          files.current.clear();
          setQueue([]);
        }}
      />
      <SelectionPanel album={album} filter={filtering ? selectionFilter : ""} onFilter={setSelectionFilter} />
      <div className="z-20 -mx-4 mt-4 lg:sticky lg:top-16 border-y border-line bg-canvas/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 xl:-mx-8 xl:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-semibold">
              <input
                ref={selectAll}
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={total > 0 && selected.size === total}
                onChange={(event) => setSelected(event.target.checked ? new Set(album.photos.map((photo) => photo.id)) : new Set())}
              />{" "}
              Chọn tất cả
            </label>
            <span className="px-1 text-sm text-mist">{selected.size ? `Đã chọn ${selected.size}` : "Chưa chọn ảnh"}</span>
            <span className="hidden h-6 w-px bg-line sm:block" />
            <button type="button" onClick={setSelectedCover} className={ui.secondary} disabled={!one}>
              <Icon name="image" className="h-4 w-4" /> Đặt làm ảnh bìa
            </button>
            <button
              type="button"
              onClick={toggleMobileCover}
              className={ui.secondary}
              disabled={!one}
              title="Ảnh bìa hiển thị khi khách mở album trên điện thoại, nên chọn ảnh dọc"
            >
              <Icon name="smartphone" className="h-4 w-4" />
              {one && album.mobileCoverId === [...selected][0] ? "Bỏ bìa điện thoại" : "Bìa điện thoại"}
            </button>
            <span className="inline-flex">
              <button
                type="button"
                onClick={() => movePhoto(albumId, [...selected][0], -1)}
                className="grid h-10 w-10 place-items-center rounded-l-xl border border-line bg-white text-ink hover:bg-canvas disabled:opacity-40"
                disabled={!one}
                aria-label="Chuyển lên trước"
                title="Chuyển lên trước"
              >
                <Icon name="chevron-left" className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => movePhoto(albumId, [...selected][0], 1)}
                className="-ml-px grid h-10 w-10 place-items-center rounded-r-xl border border-line bg-white text-ink hover:bg-canvas disabled:opacity-40"
                disabled={!one}
                aria-label="Chuyển ra sau"
                title="Chuyển ra sau"
              >
                <Icon name="chevron-right" className="h-4 w-4" />
              </button>
            </span>
            <button type="button" onClick={() => void deleteSelected()} className={cn(ui.secondary, "text-rose-600 hover:bg-rose-50")} disabled={selected.size === 0}>
              <Icon name="trash-2" className="h-4 w-4" /> Xóa
            </button>
          </div>
          <label className="relative block w-full lg:w-48">
            <select
              value="manual"
              onChange={(event) => {
                const mode = event.target.value as SortMode;
                if (mode === "manual") return;
                sortPhotos(albumId, mode);
                toast("Đã cập nhật thứ tự ảnh");
              }}
              className={cn(ui.input, "appearance-none pr-9")}
            >
              <option value="manual">Thứ tự tùy chỉnh</option>
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="name">Tên</option>
              <option value="size">Dung lượng lớn nhất</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mist">
              <Icon name="chevron-down" className="h-4 w-4" />
            </span>
          </label>
        </div>
      </div>
      <div className="mt-4">
        {visible.length ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {visible.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                album={album}
                selected={selected.has(photo.id)}
                picked={pickedIds.has(photo.id)}
                request={requests[photo.id]}
                edit={editDone(album.selection?.photoEdits, photo.id, requests[photo.id])}
                onEdit={setEditing}
                onUndoEdit={undoEdit}
                sortable={!filtering}
                onToggle={toggle}
                onPreview={preview}
                onDragStart={onDragStart}
                onDrop={onDrop}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
            <p className="text-lg font-semibold">Chưa có ảnh nào</p>
            <p className="mt-2 text-sm text-mist">Hãy tải lên những ảnh đầu tiên của buổi chụp.</p>
          </div>
        )}
      </div>
      {editing ? <EditDoneDialog album={album} photoId={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
