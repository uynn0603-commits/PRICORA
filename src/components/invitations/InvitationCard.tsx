import { photoSrc } from "@/lib/media";
import type { Invitation, Photo } from "@/lib/types";
import { MusicButton } from "./MusicButton";
import { Reveal } from "./Reveal";
import type { InvitationViewProps } from "./types";

const PETALS = [
  { left: "6%", delay: "0s", duration: "12s", size: 7 },
  { left: "18%", delay: "3.2s", duration: "14s", size: 5 },
  { left: "34%", delay: "1.4s", duration: "11s", size: 8 },
  { left: "58%", delay: "4.6s", duration: "13s", size: 6 },
  { left: "74%", delay: "2.1s", duration: "15s", size: 7 },
  { left: "88%", delay: "6s", duration: "12s", size: 5 },
];

const INK = "text-[#2C241C]";
const MUTED = "text-[#2C241C]/60";

function namesOf(invitation: Pick<Invitation, "groomName" | "brideName">) {
  return `${invitation.groomName} & ${invitation.brideName}`;
}

function longDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Date(year, month - 1, day).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// Monday-first month grid with the wedding day circled.
function Month({ iso }: { iso: string }) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;
  const first = new Date(year, month - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const total = new Date(year, month, 0).getDate();
  const cells = [...Array(offset).fill(0), ...Array.from({ length: total }, (_, index) => index + 1)];
  const label = first.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  return (
    <div className="mx-auto max-w-[320px]">
      <p className="text-center font-playfair text-lg capitalize">{label}</p>
      <div className="mt-4 grid grid-cols-7 gap-y-1 text-center text-[11px] uppercase tracking-wider text-[#2C241C]/45">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-sm">
        {cells.map((value, index) => (
          <span key={index} className="grid h-9 place-items-center">
            {value ? (
              <span className={value === day ? "invite-day grid h-8 w-8 place-items-center rounded-full bg-[#9A7B4F] font-semibold text-white" : ""}>{value}</span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

function Photo({ photo, className }: { photo: Photo; className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photoSrc(photo, 1600)} alt={photo.name} className={`${className} object-cover object-[center_20%]`} />
  );
}

export function InvitationCard({ invitation, studioName, photos, shareUrl, showBrand, preview = false }: InvitationViewProps) {
  const hero = photos[0];
  const couple = photos[1];
  const rest = photos.slice(hero ? (couple ? 2 : 1) : 0);
  const when = [longDate(invitation.weddingDate), invitation.weddingTime].filter(Boolean).join(" · ");

  return (
    <article className={`mx-auto min-h-screen max-w-[560px] bg-[#FBF7F2] ${INK}`}>
      {preview ? <p className="bg-[#9A7B4F] px-4 py-2 text-center text-xs font-semibold text-white">Bản xem trước. Khách chỉ mở được thiệp sau khi xuất bản.</p> : null}
      <header className="rise-in px-6 pt-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#9A7B4F]">{studioName}</p>
      </header>

      <section className="px-4 pt-5">
        <div className="relative h-[72svh] min-h-[460px] overflow-hidden bg-[#EFE6DA]">
          {hero ? <Photo photo={hero} className="invite-hero-photo absolute inset-0 h-full w-full" /> : null}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {PETALS.map((petal) => (
              <span
                key={petal.left}
                className="invite-petal"
                style={{ left: petal.left, width: petal.size, height: petal.size * 1.6, animationDelay: petal.delay, animationDuration: petal.duration }}
              />
            ))}
          </div>
          <div className="rise-in absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2C241C]/75 via-[#2C241C]/25 to-transparent px-6 pb-8 pt-24 text-center text-white">
            <p className="text-[11px] uppercase tracking-[0.4em] text-white/75">Trân trọng kính mời</p>
            <h1 className="mt-3 font-playfair text-5xl font-normal leading-tight">{namesOf(invitation)}</h1>
          </div>
        </div>
      </section>

      <Reveal className="px-8 py-14 text-center">
        <p className="font-playfair text-2xl italic text-[#9A7B4F]">Save the date</p>
        {invitation.message ? <p className="mx-auto mt-6 max-w-sm text-[15px] leading-8">{invitation.message}</p> : null}
        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          <div>
            <p className={`text-[11px] uppercase tracking-[0.28em] ${MUTED}`}>Nhà trai</p>
            <p className="mt-2 font-playfair text-xl">{invitation.groomParents || invitation.groomName}</p>
          </div>
          <div>
            <p className={`text-[11px] uppercase tracking-[0.28em] ${MUTED}`}>Nhà gái</p>
            <p className="mt-2 font-playfair text-xl">{invitation.brideParents || invitation.brideName}</p>
          </div>
        </div>
      </Reveal>

      {couple ? (
        <Reveal className="px-4">
          <Photo photo={couple} className="aspect-[4/5] w-full" />
          <p className="py-8 text-center font-playfair text-3xl italic">{namesOf(invitation)}</p>
        </Reveal>
      ) : null}

      {invitation.weddingDate ? (
        <Reveal className="px-6 py-12">
          <p className="text-center text-[11px] uppercase tracking-[0.32em] text-[#9A7B4F]">Ngày trọng đại</p>
          <div className="mt-6">
            <Month iso={invitation.weddingDate} />
          </div>
          {when ? <p className="mt-6 text-center font-playfair text-lg capitalize">{when}</p> : null}
        </Reveal>
      ) : null}

      {rest.length ? (
        <section className="grid grid-cols-2 gap-2 px-4">
          {rest.map((photo, index) => (
            <Reveal key={photo.id} delay={index % 2 === 0 ? 0 : 120}>
              <Photo photo={photo} className="aspect-[3/4] w-full" />
            </Reveal>
          ))}
        </section>
      ) : null}

      {invitation.venue || invitation.address ? (
        <Reveal className="px-8 py-14 text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#9A7B4F]">Tiệc cưới</p>
          {invitation.venue ? <h2 className="mt-4 font-playfair text-3xl">{invitation.venue}</h2> : null}
          {invitation.address ? <p className={`mx-auto mt-3 max-w-sm text-sm leading-7 ${MUTED}`}>{invitation.address}</p> : null}
          {when ? <p className="mt-4 text-sm font-semibold capitalize">{when}</p> : null}
          {invitation.mapUrl ? (
            <a href={invitation.mapUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex h-11 items-center rounded-full border border-[#9A7B4F] px-6 text-sm font-semibold text-[#9A7B4F] transition hover:bg-[#9A7B4F] hover:text-white">
              Xem đường đi
            </a>
          ) : null}
        </Reveal>
      ) : null}

      {shareUrl && !preview ? (
        <section className="px-8 pb-14 text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#9A7B4F]">Mở trên điện thoại</p>
          {/* The code only encodes this thiệp's own address, so it can be printed on paper cards. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(shareUrl)}`}
            alt="Mã QR của thiệp"
            width={180}
            height={180}
            className="mx-auto mt-5 bg-white p-2"
          />
        </section>
      ) : null}

      <Reveal className="px-8 pb-16 text-center">
        {invitation.thankYou ? <p className="mx-auto max-w-sm font-playfair text-xl italic leading-9">{invitation.thankYou}</p> : null}
        <p className="mt-8 font-playfair text-3xl">{namesOf(invitation)}</p>
        {showBrand ? <p className={`mt-10 text-[11px] uppercase tracking-[0.24em] ${MUTED}`}>Thiệp tạo trên PICORA</p> : null}
      </Reveal>
      <MusicButton url={invitation.musicUrl} />
    </article>
  );
}
