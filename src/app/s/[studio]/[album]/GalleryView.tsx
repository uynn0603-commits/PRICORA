"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { GalleryFooter } from "@/components/gallery/GalleryFooter";
import { toGalleryModel } from "@/components/gallery/model";
import { getTemplateComponent } from "@/components/templates";
import { Icon } from "@/components/ui/Icon";
import { StudioLockup } from "@/components/ui/Logo";
import { statusLabel } from "@/components/ui/StatusBadge";
import { isTemplateId } from "@/lib/catalog";
import { coverSrc } from "@/lib/media";
import { applyBrand, getPublicGallery, loadPublicGallery, unlock, type GalleryState } from "@/lib/store";
import type { Album, Studio } from "@/lib/types";
import { ui } from "@/lib/ui";
import { useStore, useTitle } from "@/lib/use-store";

const COPY: Record<string, { eyebrow: string; title: string; body: string }> = {
  expired: {
    eyebrow: "Album không khả dụng",
    title: "Album này đã hết hạn",
    body: "Liên kết từ nhiếp ảnh gia không còn hoạt động. Hãy liên hệ studio nếu bạn vẫn cần những bức ảnh này.",
  },
  hidden: {
    eyebrow: "Album không khả dụng",
    title: "Album này hiện không khả dụng",
    body: "Studio đã tạm tắt liên kết này. Hãy liên hệ lại với studio nếu bạn đang chờ nhận ảnh.",
  },
  unpublished: {
    eyebrow: "Album không khả dụng",
    title: "Album này chưa sẵn sàng",
    body: "Nhiếp ảnh gia vẫn đang chuẩn bị album. Liên kết sẽ mở khi album được xuất bản.",
  },
  suspended: {
    eyebrow: "Album không khả dụng",
    title: "Studio đang tạm ngưng hoạt động",
    body: "Các album của studio này tạm thời không thể xem. Hãy liên hệ trực tiếp với studio để được hỗ trợ.",
  },
  invalid: {
    eyebrow: "Album không khả dụng",
    title: "Không tìm thấy album này",
    body: "Liên kết không khớp với album nào. Hãy kiểm tra lại địa chỉ bạn nhận được từ studio.",
  },
};

export function GalleryView() {
  const version = useStore();
  const params = useParams<{ studio: string; album: string }>();
  const search = useSearchParams();
  const gallery = getPublicGallery(params.studio, params.album);
  const studio = gallery?.studio || null;
  const album = gallery?.album || null;
  const access = { state: gallery?.state || "invalid", admin: Boolean(gallery?.admin), status: gallery?.status };
  const titled = album && studio && (access.state === "ok" || access.state === "password");
  useTitle(titled ? `${album.name} · ${studio.name}` : gallery ? "Album không khả dụng · PICORA" : "");

  useEffect(() => {
    void loadPublicGallery(params.studio, params.album);
  }, [params.studio, params.album]);

  useLayoutEffect(() => {
    applyBrand(studio?.settings);
  }, [studio, version]);

  // Studio members may preview another template via ?template= before applying it;
  // clients always see the template saved on the album.
  const requested = search.get("template") ?? undefined;
  const override = access.admin && isTemplateId(requested) ? requested : undefined;
  const embedded = search.get("embed") === "1";
  const ok = access.state === "ok";
  const model = useMemo(
    () => (ok && album ? toGalleryModel(album, { templateId: override, studio, preview: access.admin }) : null),
    // The store mutates albums in place, so `version` is what signals a change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ok, album, studio, override, version, access.admin],
  );

  if (!gallery) return null;
  if (access.state === "password" && album)
    return <PasswordGate album={album} studio={studio} studioSlug={params.studio} albumSlug={params.album} />;
  if (!model || !album) return <Unavailable state={access.state} studio={studio} />;

  const Template = getTemplateComponent(model.templateId);
  const banner =
    access.admin && !embedded && access.status !== "published" ? (
      <div className="bg-[#191827] px-4 py-2 text-center font-jakarta text-xs text-white">
        Chế độ xem trước của studio. Khách hàng hiện thấy album ở trạng thái “{statusLabel(access.status)}”.{" "}
        <Link href={`/admin/albums/${album.id}/share`} className="underline">
          Chỉnh quyền truy cập
        </Link>
      </div>
    ) : null;
  return <Template model={model} banner={banner} />;
}

function PasswordGate({
  album,
  studio,
  studioSlug,
  albumSlug,
}: {
  album: Album;
  studio: Studio | null;
  studioSlug: string;
  albumSlug: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cover = coverSrc(album, 1600);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await unlock(studioSlug, albumSlug, password.trim());
    setBusy(false);
    if (result.ok) return;
    setError(result.error);
    inputRef.current?.focus();
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink">
      {cover && <img src={cover} alt="" className="absolute inset-0 h-full w-full scale-105 object-cover opacity-40 blur-2xl" />}
      <div className="absolute inset-0 bg-ink/55" />
      <div className="relative mx-auto flex min-h-screen max-w-md items-center px-4 py-12">
        <div className="w-full rounded-3xl bg-white p-7 sm:p-8">
          <StudioLockup studio={studio} size={32} />
          <h1 className="mt-8 text-2xl font-semibold tracking-tight">Album này được bảo vệ</h1>
          <p className="mt-2 text-sm text-mist">{album.name}</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <label className="block">
              <span className={ui.label}>Mật khẩu</span>
              <input
                ref={inputRef}
                type="password"
                autoComplete="current-password"
                className={ui.input}
                placeholder="Nhập mật khẩu album"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <p className={`${error ? "" : "hidden "}text-sm font-medium text-rose-600`}>{error}</p>
            <button type="submit" disabled={busy} className={`${ui.primary} h-11 w-full`}>
              {busy ? "Đang mở..." : "Xem album"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Unavailable({ state, studio }: { state: GalleryState; studio: Studio | null }) {
  const copy = COPY[state] || COPY.invalid;
  const brand = state === "invalid" ? null : studio;
  const glyph = state === "expired" ? "calendar" : state === "invalid" ? "link" : "eye-off";
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="px-6 py-5">
        <StudioLockup studio={brand} size={32} />
      </header>
      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="max-w-md text-center">
          <span className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-line bg-white text-primary">
            <Icon name={glyph} className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold text-primary">{copy.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="mt-4 text-sm leading-relaxed text-mist">{copy.body}</p>
        </div>
      </main>
      <GalleryFooter tone="light" studio={brand ? { name: brand.name, logoDataUrl: brand.settings?.logoDataUrl, slogan: brand.settings?.slogan } : null} />
    </div>
  );
}
