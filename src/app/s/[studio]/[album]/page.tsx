import type { Metadata } from "next";
import { headers } from "next/headers";
import { photoSrc } from "@/lib/media";
import { asSystem } from "@/server/db";
import { resolveGallery } from "@/server/gallery";
import { GalleryView } from "./GalleryView";

type Params = Promise<{ studio: string; album: string }>;

async function origin(): Promise<string> {
  const list = await headers();
  const host = list.get("x-forwarded-host") || list.get("host") || "localhost:3000";
  const proto = list.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Link previews in Zalo, Messenger and Facebook read these tags without running JavaScript.
// The cover is only shown for albums anyone with the link can open.
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { studio: studioSlug, album: albumSlug } = await params;
  const robots = { index: false, follow: false };
  const { state, studio, album } = await asSystem((tx) => resolveGallery(tx, studioSlug, albumSlug)).catch(() => ({
    state: "invalid" as const,
    studio: null,
    album: null,
  }));
  if (!album || !studio || (state !== "ok" && state !== "password")) {
    return { title: "Album không khả dụng · PICORA", robots };
  }

  const title = `${album.name} · ${studio.name}`;
  const description =
    state === "password"
      ? `Album được bảo vệ bằng mật khẩu từ ${studio.name}.`
      : album.description.trim().slice(0, 180) || `${album.photos.length} ảnh từ ${studio.name}.`;
  let image = "";
  if (state === "ok") {
    const cover = album.photos.find((photo) => photo.id === album.coverId) || album.photos[0];
    if (album.coverDataUrl) image = album.coverDataUrl;
    else if (cover?.unsplash) image = `${photoSrc(cover, 1200, 1200 / 630)}&fm=jpg`;
    else if (cover) image = photoSrc(cover, 1024);
  }
  if (image.startsWith("/")) image = `${await origin()}${image}`;
  const images = image.startsWith("http") ? [{ url: image, alt: album.name }] : undefined;

  return {
    title,
    description,
    robots,
    openGraph: { type: "website", title, description, siteName: studio.name, locale: "vi_VN", images },
    twitter: { card: images ? "summary_large_image" : "summary", title, description, images: images?.map((item) => item.url) },
  };
}

export default function GalleryPage() {
  return <GalleryView />;
}
