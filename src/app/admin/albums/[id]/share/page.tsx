"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { AlbumNotFound } from "@/components/albums/AlbumNotFound";
import { TemplateChip } from "@/components/albums/AlbumCard";
import { PageHeader } from "@/components/ui/fields";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge, statusLabel } from "@/components/ui/StatusBadge";
import { copyText } from "@/lib/clipboard";
import { cn, daysUntil, expiryPhrase, formatDate } from "@/lib/format";
import { confirmDialog, toast } from "@/lib/overlay";
import { albumUrl, effectiveStatus, extendExpiration, galleryPath, getAlbum, updateAlbum } from "@/lib/store";
import type { Album } from "@/lib/types";
import { ui } from "@/lib/ui";
import { useStore, useTitle } from "@/lib/use-store";

function linkStatus(album: Album) {
  const status = effectiveStatus(album);
  if (status === "published" && album.password) return "Có mật khẩu";
  if (status === "published") return "Đang hoạt động";
  return statusLabel(status);
}

export default function SharePage() {
  useStore();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const album = getAlbum(id);
  useTitle(`${album?.name || "Chia sẻ"} · PICORA`);
  const [password, setPassword] = useState(album?.password || "");
  const [expiry, setExpiry] = useState(album?.expiresAt || "");
  const [showPassword, setShowPassword] = useState(false);
  const urlField = useRef<HTMLInputElement>(null);

  if (!album) return <AlbumNotFound />;
  const albumId = album.id;
  const status = effectiveStatus(album);
  const url = albumUrl(album);
  const days = album.expiresAt ? daysUntil(album.expiresAt) : null;
  const published = searchParams.get("published") === "1";

  // Every action re-renders the page from the saved album, like a fresh visit.
  const reload = () => {
    const saved = getAlbum(albumId);
    setPassword(saved?.password || "");
    setExpiry(saved?.expiresAt || "");
    setShowPassword(false);
    if (published) router.replace(`/admin/albums/${albumId}/share`);
    else window.scrollTo(0, 0);
  };

  const copyLink = async () => {
    const current = getAlbum(albumId);
    const ok = current ? await copyText(albumUrl(current)) : false;
    if (ok) {
      toast("Đã sao chép liên kết");
      return;
    }
    urlField.current?.focus();
    urlField.current?.select();
    toast("Đã chọn liên kết. Nhấn Ctrl+C để sao chép.", "info");
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateAlbum(albumId, { password: password.trim(), expiresAt: expiry });
    toast("Đã cập nhật cài đặt chia sẻ");
    reload();
  };

  const extend = () => {
    const next = extendExpiration(albumId, 30);
    if (next) toast(`Đã gia hạn đến ${formatDate(next.expiresAt)}`);
    reload();
  };

  const toggleLink = async () => {
    const current = getAlbum(albumId);
    if (!current) return;
    const hidden = effectiveStatus(current) === "hidden" || current.status === "hidden";
    if (!hidden) {
      const ok = await confirmDialog({
        title: "Tắt liên kết này?",
        message: "Khách hàng sẽ thấy trang thông báo album không khả dụng cho đến khi bạn bật lại.",
        confirmText: "Tắt liên kết",
        danger: true,
      });
      if (!ok) return;
      updateAlbum(albumId, { status: "hidden" });
      toast("Đã tắt liên kết của khách");
    } else {
      updateAlbum(albumId, { status: "published" });
      const next = effectiveStatus(getAlbum(albumId));
      toast(next === "expired" ? "Đã bật liên kết, nhưng ngày hết hạn vẫn đã qua." : "Đã bật liên kết của khách");
    }
    reload();
  };

  return (
    <>
      <PageHeader
        title="Chia sẻ album"
        description={album.name}
        actions={
          <>
            <Link href={`/admin/invitations/new?album=${album.id}`} className={ui.secondary}>
              <Icon name="mail" className="h-4 w-4" /> Tạo thiệp
            </Link>
            <Link href={galleryPath(album)} className={ui.secondary}>
              <Icon name="eye" className="h-4 w-4" /> Mở album
            </Link>
          </>
        }
      />
      {published ? (
        <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
          <p className="font-semibold">Đã xuất bản album</p>
          <p className="mt-1 text-sm text-mist">Liên kết cho khách đã sẵn sàng. Hãy sao chép và gửi kèm mật khẩu nếu bạn có đặt.</p>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-5">
        <section className={cn(ui.card, "p-5 lg:col-span-3")}>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {status === "published" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 text-[11px] font-semibold text-ink">
                {album.password ? (
                  <>
                    <Icon name="lock" className="h-3 w-3" /> Có mật khẩu
                  </>
                ) : (
                  "Liên kết mở"
                )}
              </span>
            ) : null}
          </div>
          <p className="mt-5 text-[13px] font-semibold">Liên kết công khai</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input ref={urlField} readOnly value={url} className={cn(ui.input, "bg-canvas")} />
            <button type="button" onClick={() => void copyLink()} className={cn(ui.primary, "shrink-0")}>
              <Icon name="copy" className="h-4 w-4" /> Sao chép liên kết
            </button>
          </div>
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <label className="block">
              <span className={ui.label}>Mật khẩu truy cập</span>
              <span className="relative block">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Không có mật khẩu"
                  className={cn(ui.input, "pr-11")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((show) => !show)}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-mist"
                  aria-label="Hiện mật khẩu"
                >
                  <Icon name="eye" className="h-4 w-4" />
                </button>
              </span>
              <span className="mt-1.5 block text-xs text-mist">Xóa trống ô này để ai có liên kết cũng xem được.</span>
            </label>
            <label className="block">
              <span className={ui.label}>Ngày hết hạn</span>
              <input type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} className={ui.input} />
              <span className="mt-1.5 block text-xs text-mist">
                {album.expiresAt ? `${formatDate(album.expiresAt)} · ${expiryPhrase(days)}` : "Không có ngày kết thúc"}
              </span>
            </label>
            <div className="flex flex-wrap gap-2 pt-2">
              <button type="submit" className={ui.primary}>
                Cập nhật cài đặt
              </button>
              <button type="button" onClick={extend} className={ui.secondary}>
                <Icon name="calendar" className="h-4 w-4" /> Gia hạn 30 ngày
              </button>
              <button
                type="button"
                onClick={() => void toggleLink()}
                className={cn(ui.secondary, status !== "hidden" && "text-rose-600 hover:bg-rose-50", "sm:ml-auto")}
              >
                {status === "hidden" ? "Bật liên kết" : "Tắt liên kết"}
              </button>
            </div>
          </form>
        </section>
        <aside className={cn(ui.card, "p-5 lg:col-span-2")}>
          <h2 className="font-semibold">{album.name}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-mist">Khách hàng</dt>
              <dd className="text-right font-medium">{album.customerName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-mist">Số ảnh</dt>
              <dd className="font-medium">{album.photos.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-mist">Ngày chụp</dt>
              <dd className="font-medium">{formatDate(album.shootingDate)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-mist">Trạng thái liên kết</dt>
              <dd className="font-medium">{linkStatus(album)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-mist">Giao diện</dt>
              <dd className="flex min-w-0 items-center gap-2">
                <TemplateChip album={album} />
                <Link href={`/admin/albums/${album.id}/template`} className="text-xs font-semibold text-primary hover:underline">
                  Đổi
                </Link>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-mist">Tải ảnh</dt>
              <dd className="font-medium">{album.allowDownload === false ? "Tắt" : "Cho phép"}</dd>
            </div>
          </dl>
          <Link href={`/admin/albums/${album.id}/photos`} className={cn(ui.secondary, "mt-6 w-full")}>
            Quản lý ảnh
          </Link>
        </aside>
      </div>
    </>
  );
}
