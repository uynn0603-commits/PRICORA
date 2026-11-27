import { photoSrc } from "@/lib/media";
import { countdownClock, emptyContent, eventTypeLabel } from "@/lib/invitation-content";
import type { WeddingPlace } from "@/lib/invitation-content";
import type { Photo } from "@/lib/types";
import { Countdown } from "./Countdown";
import { MusicButton } from "./MusicButton";
import type { InvitationViewProps } from "./types";

const INK = "#3A241C";
const WINE = "#8C1D2C";
const GOLD = "#C4A574";

function longDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Date(year, month - 1, day).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function Frame({ photo, className, alt }: { photo?: Photo; className: string; alt: string }) {
  if (!photo) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photoSrc(photo, 1400)} alt={alt} className={`${className} w-full object-cover object-[center_20%]`} />
  );
}

function Rule() {
  return (
    <div className="flex items-center justify-center gap-3" aria-hidden="true">
      <span className="h-px w-14" style={{ background: GOLD }} />
      <span className="text-[9px]" style={{ color: WINE }}>
        ◆
      </span>
      <span className="h-px w-14" style={{ background: GOLD }} />
    </div>
  );
}

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
      <p className="text-center font-cormorant text-4xl italic" style={{ color: WINE }}>
        Happy Wedding
      </p>
      <p className="mt-2 text-center font-playfair text-lg capitalize" style={{ color: INK }}>
        {label}
      </p>
      <div className="mt-4 grid grid-cols-7 text-center text-[11px] uppercase tracking-wider" style={{ color: `${INK}99` }}>
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 text-center text-sm" style={{ color: INK }}>
        {cells.map((value, index) => (
          <span key={index} className="grid h-9 place-items-center">
            {value ? (
              <span className={value === day ? "grid h-8 w-8 place-items-center rounded-full font-semibold text-white" : ""} style={value === day ? { background: WINE } : undefined}>
                {value}
              </span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

function Family({ title, father, mother, address, hometown, photo }: { title: string; father: string; mother: string; address: string; hometown: string; photo?: Photo }) {
  const lines = [
    father ? `Ông: ${father}` : "",
    mother ? `Bà: ${mother}` : "",
    address,
    hometown ? `Quê quán: ${hometown}` : "",
  ].filter(Boolean);
  if (!lines.length && !photo) return null;
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: WINE }}>
        {title}
      </p>
      {lines.length ? (
        <div className="mt-3 space-y-1 text-sm leading-7" style={{ color: INK }}>
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : null}
      {photo ? <Frame photo={photo} alt={title} className="mt-4 aspect-[4/5]" /> : null}
    </div>
  );
}

export function TraditionalWedding({ invitation, studioName, photos, shareUrl, showBrand, preview = false }: InvitationViewProps) {
  const content = invitation.content || emptyContent();
  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  const photoOf = (id: string) => (id ? byId.get(id) : undefined);
  const cover = photoOf(content.coverImageId);
  const logo = photoOf(content.studioLogoId);
  const visible = content.photos.filter((photo) => photo.visible);
  const couple = visible.find((photo) => photo.kind === "couple");
  const used = new Set([content.coverImageId, couple?.photoId || "", content.brideFamily.familyImageId, content.groomFamily.familyImageId].filter(Boolean));
  const gallery = visible.filter((photo) => photo.photoId && !used.has(photo.photoId) && photo.kind !== "cover");
  const bride = content.brideFamily;
  const groom = content.groomFamily;
  const showBride = bride.fatherName || bride.motherName || bride.familyAddress || bride.hometown || bride.familyImageId;
  const showGroom = groom.fatherName || groom.motherName || groom.familyAddress || groom.hometown || groom.familyImageId;
  const events = content.events.filter((event) => event.name || event.venueName || event.date || event.venueAddress);
  const places: WeddingPlace[] = content.places.filter((place) => place.name || place.address || place.mapUrl);
  const stops = places.length
    ? places
    : events
        .filter((event) => event.mapUrl || event.venueAddress || event.venueName)
        .map((event) => ({ id: event.id, name: event.venueName || event.name, address: event.venueAddress, mapUrl: event.mapUrl, imageId: event.imageId, eventId: event.id }));
  const marked = content.calendarHighlightDate || invitation.weddingDate;
  const names = `${invitation.groomName} & ${invitation.brideName}`;

  return (
    <article className="relative mx-auto min-h-screen max-w-[480px] bg-[#F7F1E8]" style={{ color: INK }}>
      {preview ? <p className="px-4 py-2 text-center text-xs font-semibold text-white" style={{ background: WINE }}>Bản xem trước. Khách chỉ mở được thiệp sau khi xuất bản.</p> : null}
      <header className="px-6 pb-2 pt-8 text-center">
        {logo ? <Frame photo={logo} alt={studioName} className="mx-auto mb-4 h-16 w-16 rounded-full" /> : null}
        <p className="text-[11px] font-semibold uppercase tracking-[0.34em]" style={{ color: WINE }}>
          {studioName}
        </p>
      </header>

      <section className="px-4 pt-4">
        <div className="relative overflow-hidden bg-[#EFE2D4]">
          {cover ? <Frame photo={cover} alt={names} className="aspect-[3/4] min-h-[420px]" /> : <div className="aspect-[3/4] min-h-[420px]" />}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#3A241C]/80 via-[#3A241C]/20 to-transparent px-6 pb-8 pt-24 text-center text-white">
            {content.invitationTitle ? <p className="text-[11px] uppercase tracking-[0.38em] text-white/80">{content.invitationTitle}</p> : null}
            <h1 className="mt-3 font-cormorant text-5xl font-medium italic leading-tight">{names}</h1>
          </div>
        </div>
      </section>

      {content.introduction ? (
        <section className="px-8 py-10 text-center">
          <div className="border px-5 py-6" style={{ borderColor: GOLD }}>
            <p className="whitespace-pre-line text-sm leading-8">{content.introduction}</p>
          </div>
        </section>
      ) : null}

      <section className="px-8 pb-10 text-center">
        <Rule />
        <p className="mt-6 font-cormorant text-4xl italic" style={{ color: WINE }}>
          {invitation.groomName}
        </p>
        <p className="font-cormorant text-3xl italic" style={{ color: GOLD }}>
          &
        </p>
        <p className="font-cormorant text-4xl italic" style={{ color: WINE }}>
          {invitation.brideName}
        </p>
      </section>

      {couple ? (
        <section className="px-4">
          <Frame photo={photoOf(couple.photoId)} alt={couple.caption || names} className="aspect-[4/5]" />
          {couple.caption ? <p className="py-4 text-center text-sm">{couple.caption}</p> : null}
        </section>
      ) : null}

      {showBride || showGroom ? (
        <section className="grid gap-8 px-8 py-12 sm:grid-cols-2">
          {showGroom ? <Family title="Nhà trai" father={groom.fatherName} mother={groom.motherName} address={groom.familyAddress} hometown={groom.hometown} photo={photoOf(groom.familyImageId)} /> : null}
          {showBride ? <Family title="Nhà gái" father={bride.fatherName} mother={bride.motherName} address={bride.familyAddress} hometown={bride.hometown} photo={photoOf(bride.familyImageId)} /> : null}
        </section>
      ) : null}

      {content.invitationMessage || content.invitationFrom || content.invitationNote ? (
        <section className="px-8 pb-12 text-center">
          <Rule />
          {content.invitationMessage ? <p className="mt-6 whitespace-pre-line text-[15px] leading-8">{content.invitationMessage}</p> : null}
          {content.invitationFrom ? <p className="mt-5 font-cormorant text-2xl italic" style={{ color: WINE }}>{content.invitationFrom}</p> : null}
          {content.invitationNote ? <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#3A241C]/70">{content.invitationNote}</p> : null}
        </section>
      ) : null}

      {content.calendarEnabled && marked ? (
        <section className="px-6 py-4">
          <Month iso={marked} />
          {invitation.weddingDate ? <p className="mt-4 text-center font-playfair text-lg capitalize">{longDate(invitation.weddingDate)}</p> : null}
        </section>
      ) : null}

      {content.countdownEnabled && invitation.weddingDate ? (
        <section className="px-6 py-8">
          <Countdown date={invitation.weddingDate} time={countdownClock(invitation)} />
        </section>
      ) : null}

      {gallery.length ? (
        <section className="grid grid-cols-2 gap-2 px-4 py-6">
          {gallery.map((item) => {
            const photo = photoOf(item.photoId);
            if (!photo) return null;
            return (
              <figure key={item.photoId} className={item.kind === "memory" ? "col-span-2" : ""}>
                <Frame photo={photo} alt={item.caption || names} className={item.kind === "memory" ? "aspect-[16/10]" : "aspect-[3/4]"} />
                {item.caption ? <figcaption className="px-2 py-2 text-center text-xs leading-5">{item.caption}</figcaption> : null}
              </figure>
            );
          })}
        </section>
      ) : null}

      {events.length ? (
        <section className="space-y-8 px-6 py-10">
          <Rule />
          {events.map((event) => (
            <article key={event.id} className="text-center">
              {photoOf(event.imageId) ? <Frame photo={photoOf(event.imageId)} alt={event.name || event.venueName} className="mb-4 aspect-[16/10]" /> : null}
              <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: WINE }}>
                {eventTypeLabel(event.type)}
              </p>
              {event.name ? <h2 className="mt-2 font-playfair text-3xl">{event.name}</h2> : null}
              <p className="mt-3 text-sm leading-7">
                {[event.date ? longDate(event.date) : "", event.startTime].filter(Boolean).join(" · ")}
              </p>
              {event.venueName ? <p className="mt-2 font-playfair text-xl">{event.venueName}</p> : null}
              {event.venueAddress ? <p className="mt-1 text-sm leading-7 text-[#3A241C]/75">{event.venueAddress}</p> : null}
            </article>
          ))}
        </section>
      ) : null}

      {stops.length ? (
        <section className="space-y-4 px-4 py-6">
          {stops.map((stop) => (
            <article key={stop.id} className="overflow-hidden text-white" style={{ background: WINE }}>
              {photoOf(stop.imageId) ? <Frame photo={photoOf(stop.imageId)} alt={stop.name || "Địa điểm"} className="aspect-[16/8] opacity-90" /> : null}
              <div className="px-6 py-6 text-center">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/70">Chỉ đường</p>
                {stop.name ? <h2 className="mt-2 font-playfair text-2xl">{stop.name}</h2> : null}
                {stop.address ? <p className="mt-2 text-sm leading-7 text-white/80">{stop.address}</p> : null}
                {stop.mapUrl.startsWith("https://") ? (
                  <a href={stop.mapUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex border border-white/40 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em]">
                    Chỉ đường
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {shareUrl ? (
        <section className="px-8 py-8 text-center">
          <div className="mx-auto w-fit p-3" style={{ background: WINE }}>
            <div className="bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`} alt="Mã QR thiệp cưới" width={180} height={180} />
            </div>
          </div>
          <p className="mt-3 text-xs tracking-wide text-[#3A241C]/60">Quét mã để mở thiệp</p>
        </section>
      ) : null}

      {content.closingMessage ? (
        <section className="px-8 py-12 text-center">
          <p className="font-cormorant text-4xl italic" style={{ color: WINE }}>
            Thank you
          </p>
          <p className="mx-auto mt-4 max-w-sm whitespace-pre-line text-sm leading-8">{content.closingMessage}</p>
          <p className="mt-6 font-cormorant text-3xl italic">{names}</p>
        </section>
      ) : null}

      {showBrand ? <p className="pb-16 text-center text-[11px] tracking-wide text-[#3A241C]/45">Thiệp tạo trên PICORA</p> : <div className="h-16" />}
      <MusicButton
        url={invitation.musicUrl}
        className={
          preview
            ? "sticky bottom-4 z-20 ml-auto mr-4 mt-4 block w-fit rounded-full bg-[#8C1D2C] px-4 py-2 text-[12px] font-semibold tracking-wide text-white shadow-sm"
            : "fixed bottom-5 right-5 z-20 rounded-full bg-[#8C1D2C] px-4 py-2 text-[12px] font-semibold tracking-wide text-white shadow-sm"
        }
      />
    </article>
  );
}
