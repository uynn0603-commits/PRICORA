import type { Metadata } from "next";
import { headers } from "next/headers";
import { photoSrc } from "@/lib/media";
import { asSystem } from "@/server/db";
import { resolveInvitation } from "@/server/invitations";
import { InvitationView } from "@/components/invitations/InvitationView";
import { invitationTemplateId } from "@/lib/invitation-catalog";
import { TRADITIONAL_TEMPLATE_ID } from "@/lib/invitation-content";

type Params = Promise<{ studio: string; slug: string }>;

async function origin(): Promise<string> {
  const list = await headers();
  const host = list.get("x-forwarded-host") || list.get("host") || "localhost:5173";
  const proto = list.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { studio, slug } = await params;
  const robots = { index: false, follow: false };
  const found = await asSystem((tx) => resolveInvitation(tx, studio, slug)).catch(() => null);
  if (!found) return { title: "Thiệp không khả dụng · PICORA", robots };
  const title = `${found.invitation.groomName} & ${found.invitation.brideName}`;
  const description = (found.invitation.content?.introduction || found.invitation.message).slice(0, 180) || `Thiệp cưới từ ${found.studioName}.`;
  const cover = found.photos[0];
  const image = cover ? photoSrc(cover, 1200) : "";
  const url = image.startsWith("/") ? `${await origin()}${image}` : image;
  const images = url.startsWith("http") ? [{ url, alt: title }] : undefined;
  return {
    title: `${title} · ${found.studioName}`,
    description,
    robots,
    openGraph: { type: "website", title, description, siteName: found.studioName, locale: "vi_VN", images },
  };
}

export default async function InvitationPage({ params }: { params: Params }) {
  const { studio, slug } = await params;
  const found = await asSystem((tx) => resolveInvitation(tx, studio, slug)).catch(() => null);
  if (!found) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FBF7F2] px-6 text-center text-[#2C241C]">
        <div>
          <p className="font-playfair text-3xl">Thiệp không khả dụng</p>
          <p className="mt-3 text-sm text-[#2C241C]/60">Liên kết không đúng, hoặc studio chưa xuất bản thiệp này.</p>
        </div>
      </main>
    );
  }
  const shareUrl = `${await origin()}/i/${found.studioSlug}/${found.invitation.slug}`;
  const template = invitationTemplateId(found.invitation.templateId);
  const background = template === "golden-letter" ? "bg-[#F7F1E7]" : template === TRADITIONAL_TEMPLATE_ID ? "bg-[#F7F1E8]" : "bg-[#EFE6DA]";
  return (
    <main className={`min-h-screen ${background}`}>
      <InvitationView invitation={found.invitation} studioName={found.studioName} photos={found.photos} shareUrl={shareUrl} showBrand={found.showBrand} />
    </main>
  );
}
