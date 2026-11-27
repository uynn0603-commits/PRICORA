"use client";

import { useEffect, useRef, useState } from "react";
import { photoSrc } from "@/lib/media";
import type { Photo } from "@/lib/types";
import { MusicButton } from "./MusicButton";
import { Reveal } from "./Reveal";
import type { InvitationViewProps } from "./types";

const GOLD = "#B99A62";
const INK = "#49382D";
const TEXT = "#55483E";

function namesOf(groom: string, bride: string) {
  return `${groom} & ${bride}`;
}

function initials(groom: string, bride: string) {
  const first = groom.trim().charAt(0);
  const second = bride.trim().charAt(0);
  return `${first}${second}`.toUpperCase() || "GL";
}

function longDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Date(year, month - 1, day).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function weddingMoment(iso: string, time: string): number | null {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  const hours = match ? Number(match[1]) : 0;
  const minutes = match ? Number(match[2]) : 0;
  if (hours > 23 || minutes > 59) return new Date(year, month - 1, day).getTime();
  return new Date(year, month - 1, day, hours, minutes).getTime();
}

function Rule() {
  return (
    <div className="flex items-center justify-center gap-3" aria-hidden="true">
      <span className="h-px w-10 bg-[#B99A62]/45" />
      <span className="text-[9px] text-[#B99A62]">◆</span>
      <span className="h-px w-10 bg-[#B99A62]/45" />
    </div>
  );
}

function FramePhoto({ photo, className, onOpen }: { photo: Photo; className: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="group block w-full text-left" aria-label={`Xem ảnh ${photo.name}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoSrc(photo, 1600)} alt={photo.name} className={`${className} object-cover object-[center_20%] transition duration-700 group-hover:scale-[1.02]`} />
    </button>
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
      <p className="text-center font-cormorant text-2xl capitalize text-[#49382D]">{label}</p>
      <div className="mt-4 grid grid-cols-7 gap-y-1 text-center text-[11px] uppercase tracking-[0.18em] text-[#55483E]/45">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 text-center text-sm">
        {cells.map((value, index) => (
          <span key={index} className="grid h-9 place-items-center">
            {value ? (
              <span className={value === day ? "grid h-8 w-8 place-items-center rounded-full bg-[#B99A62] font-semibold text-white" : "text-[#55483E]"}>{value}</span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

function Countdown({ iso, time }: { iso: string; time: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const target = weddingMoment(iso, time);
  if (target == null) return null;
  const remaining = target - now;
  if (remaining <= 0) {
    return <p className="text-center font-cormorant text-2xl italic text-[#49382D]">Ngày trọng đại đã đến.</p>;
  }
  const totalSeconds = Math.floor(remaining / 1000);
  const units = [
    { label: "Ngày", value: Math.floor(totalSeconds / 86400) },
    { label: "Giờ", value: Math.floor((totalSeconds % 86400) / 3600) },
    { label: "Phút", value: Math.floor((totalSeconds % 3600) / 60) },
    { label: "Giây", value: totalSeconds % 60 },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {units.map((unit) => (
        <div key={unit.label} className="border border-[#B99A62]/30 bg-white/70 px-1 py-4 text-center">
          <p className="font-cormorant text-3xl text-[#49382D] sm:text-4xl">{String(unit.value).padStart(2, "0")}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#B99A62]">{unit.label}</p>
        </div>
      ))}
    </div>
  );
}

function Envelope({
  groom,
  bride,
  mark,
  opening,
  preview,
  onOpen,
}: {
  groom: string;
  bride: string;
  mark: string;
  opening: boolean;
  preview: boolean;
  onOpen: () => void;
}) {
  const names = namesOf(groom, bride);
  return (
    <section className={`gl-paper grid place-items-center px-5 py-14 text-center ${preview ? "min-h-[720px]" : "min-h-[100dvh]"}`}>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.46em] text-[#B99A62]">Golden Letter</p>
        <h1 className="mx-auto mt-5 max-w-md font-cormorant text-[44px] font-medium leading-[0.92] text-[#49382D] sm:text-[64px]">
          <span className="block">{groom}</span>
          <span className="my-1 block text-[0.55em] italic">&</span>
          <span className="block">{bride}</span>
        </h1>
        <p className="mt-4 font-cormorant text-xl italic text-[#55483E]">A Love Letter From Two Hearts</p>
        <div className={`gl-scene mx-auto mt-12 ${opening ? "is-opening" : ""}`}>
          <div className="gl-envelope">
            <div className="gl-body" />
            <div className="gl-letter">
              <p className="font-cormorant text-lg italic text-[#B99A62]">For you</p>
              <p className="mt-1 font-cormorant text-2xl text-[#49382D]">{names}</p>
            </div>
            <div className="gl-flap" aria-hidden="true">
              <span className="gl-flap-face gl-flap-front" />
              <span className="gl-flap-face gl-flap-back" />
            </div>
            <div className="gl-pocket" aria-hidden="true" />
            <button type="button" className="gl-seal" onClick={onOpen} disabled={opening} aria-label="Mở phong bì">
              {mark}
            </button>
          </div>
        </div>
        <button type="button" onClick={onOpen} disabled={opening} className="mt-10 text-[11px] uppercase tracking-[0.32em] text-[#B99A62] transition hover:text-[#49382D] disabled:opacity-40">
          Chạm để mở thư
        </button>
      </div>
    </section>
  );
}

function Lightbox({ photos, index, onClose, onIndex }: { photos: Photo[]; index: number; onClose: () => void; onIndex: (index: number) => void }) {
  const photo = photos[index];
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onIndex((index + 1) % photos.length);
      if (event.key === "ArrowLeft") onIndex((index - 1 + photos.length) % photos.length);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, onClose, onIndex, photos.length]);
  if (!photo) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#49382D]/88 p-4" role="dialog" aria-modal="true" aria-label="Ảnh thiệp">
      <button type="button" onClick={onClose} className="absolute right-4 top-4 px-3 py-2 text-xs uppercase tracking-[0.22em] text-white/80">
        Đóng
      </button>
      {photos.length > 1 ? (
        <>
          <button type="button" onClick={() => onIndex((index - 1 + photos.length) % photos.length)} className="absolute left-3 top-1/2 -translate-y-1/2 px-3 py-4 text-2xl text-white/80" aria-label="Ảnh trước">
            ‹
          </button>
          <button type="button" onClick={() => onIndex((index + 1) % photos.length)} className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-4 text-2xl text-white/80" aria-label="Ảnh sau">
            ›
          </button>
        </>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoSrc(photo, 1600)} alt={photo.name} className="max-h-[82vh] max-w-full object-contain" />
      <p className="absolute bottom-4 font-cormorant text-lg text-white/80">
        {index + 1} / {photos.length}
      </p>
    </div>
  );
}

export function GoldenLetter({ invitation, studioName, photos, shareUrl, showBrand, preview = false }: InvitationViewProps) {
  const [phase, setPhase] = useState<"sealed" | "opening" | "open">("sealed");
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const letterRef = useRef<HTMLElement>(null);
  const names = namesOf(invitation.groomName, invitation.brideName);
  const when = [longDate(invitation.weddingDate), invitation.weddingTime].filter(Boolean).join(" · ");
  const hero = photos[0];
  const gallery = photos.slice(1);

  useEffect(() => {
    if (phase !== "opening") return;
    const timer = window.setTimeout(() => setPhase("open"), 1750);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "open") return;
    letterRef.current?.focus();
  }, [phase]);

  const open = () => {
    if (phase !== "sealed") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("open");
      return;
    }
    setPhase("opening");
  };

  return (
    <div className="gl-paper font-inter text-[#55483E]" style={{ color: TEXT }}>
      {preview ? <p className="bg-[#B99A62] px-4 py-2 text-center text-xs font-semibold text-white">Bản xem trước. Khách chỉ mở được thiệp sau khi xuất bản.</p> : null}
      {phase !== "open" ? (
        <Envelope groom={invitation.groomName} bride={invitation.brideName} mark={initials(invitation.groomName, invitation.brideName)} opening={phase === "opening"} preview={preview} onOpen={open} />
      ) : null}
      {phase === "open" ? (
        <article ref={letterRef} tabIndex={-1} className="gl-page mx-auto min-h-screen max-w-[680px] bg-[#FBF8F3] outline-none md:my-8 md:min-h-0 md:shadow-[0_30px_80px_rgb(73_56_45/0.08)]">
          <header className="px-6 pb-4 pt-10 text-center">
            <p className="text-[11px] uppercase tracking-[0.42em]" style={{ color: GOLD }}>
              {studioName || "Golden Letter"}
            </p>
            <p className="mt-8 font-cormorant text-lg italic" style={{ color: GOLD }}>
              The wedding of
            </p>
            <h1 className="mt-3 font-cormorant text-[52px] font-medium leading-[0.95] sm:text-7xl" style={{ color: INK }}>
              {invitation.groomName}
              <span className="mt-1 block text-[40px] italic sm:text-5xl">&</span>
              {invitation.brideName}
            </h1>
            {when ? <p className="mt-6 text-sm capitalize tracking-wide">{when}</p> : null}
          </header>

          <section className="px-5 pt-6">
            {hero ? (
              <div className="overflow-hidden border border-[#B99A62]/35 bg-[#EFE4D2] p-2">
                <div className="overflow-hidden">
                  <FramePhoto photo={hero} onOpen={() => setPhotoIndex(0)} className="invite-hero-photo aspect-[3/4] w-full sm:aspect-[4/5]" />
                </div>
              </div>
            ) : (
              <div className="grid aspect-[4/5] place-items-center border border-[#B99A62]/35 bg-[#EFE4D2]">
                <p className="font-cormorant text-6xl" style={{ color: GOLD }}>
                  {initials(invitation.groomName, invitation.brideName)}
                </p>
              </div>
            )}
          </section>

          <Reveal className="px-8 py-16 text-center">
            <Rule />
            <p className="mt-8 text-[11px] uppercase tracking-[0.34em]" style={{ color: GOLD }}>
              A love letter
            </p>
            {invitation.message ? (
              <p className="mx-auto mt-6 max-w-md text-left text-[16px] leading-8 first-letter:float-left first-letter:mr-3 first-letter:font-cormorant first-letter:text-6xl first-letter:leading-[0.8] first-letter:text-[#B99A62]">
                {invitation.message}
              </p>
            ) : null}
          </Reveal>

          <Reveal className="px-8 pb-16">
            <div className="grid gap-10 border-y border-[#B99A62]/25 py-10 sm:grid-cols-2">
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: GOLD }}>
                  Nhà trai
                </p>
                <p className="mt-3 font-cormorant text-2xl" style={{ color: INK }}>
                  {invitation.groomParents || invitation.groomName}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: GOLD }}>
                  Nhà gái
                </p>
                <p className="mt-3 font-cormorant text-2xl" style={{ color: INK }}>
                  {invitation.brideParents || invitation.brideName}
                </p>
              </div>
            </div>
          </Reveal>

          {invitation.weddingDate ? (
            <Reveal className="px-6 pb-16">
              <p className="text-center text-[11px] uppercase tracking-[0.34em]" style={{ color: GOLD }}>
                Ngày trọng đại
              </p>
              <div className="mt-8">
                <Countdown iso={invitation.weddingDate} time={invitation.weddingTime} />
              </div>
              <div className="mt-10">
                <Month iso={invitation.weddingDate} />
              </div>
            </Reveal>
          ) : null}

          {gallery.length ? (
            <section className="grid grid-cols-2 gap-3 px-5 pb-6">
              {gallery.map((photo, index) => (
                <Reveal key={photo.id} delay={index % 2 === 0 ? 0 : 90} className={index === 0 && gallery.length > 2 ? "col-span-2" : ""}>
                  <div className="overflow-hidden bg-[#E8CFC7]/40">
                    <FramePhoto photo={photo} onOpen={() => setPhotoIndex(index + 1)} className={index === 0 && gallery.length > 2 ? "aspect-[4/5] w-full sm:aspect-[16/10]" : "aspect-[3/4] w-full"} />
                  </div>
                </Reveal>
              ))}
            </section>
          ) : null}

          {invitation.venue || invitation.address ? (
            <Reveal className="px-8 py-16 text-center">
              <Rule />
              <p className="mt-8 text-[11px] uppercase tracking-[0.34em]" style={{ color: GOLD }}>
                Tiệc cưới
              </p>
              {invitation.venue ? (
                <h2 className="mt-4 font-cormorant text-4xl font-medium" style={{ color: INK }}>
                  {invitation.venue}
                </h2>
              ) : null}
              {invitation.address ? <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-[#55483E]/75">{invitation.address}</p> : null}
              {when ? <p className="mt-4 text-sm capitalize">{when}</p> : null}
              {invitation.mapUrl ? (
                <a href={invitation.mapUrl} target="_blank" rel="noreferrer" className="mt-7 inline-flex h-11 items-center border border-[#B99A62] px-7 text-[12px] uppercase tracking-[0.22em] text-[#B99A62] transition hover:bg-[#B99A62] hover:text-white">
                  Xem đường đi
                </a>
              ) : null}
            </Reveal>
          ) : null}

          {shareUrl && !preview ? (
            <section className="px-8 pb-12 text-center">
              <p className="text-[11px] uppercase tracking-[0.32em]" style={{ color: GOLD }}>
                Mở trên điện thoại
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&color=49382D&bgcolor=FBF8F3&data=${encodeURIComponent(shareUrl)}`}
                alt="Mã QR của thiệp"
                width={168}
                height={168}
                className="mx-auto mt-5"
              />
            </section>
          ) : null}

          <Reveal className="px-8 pb-20 text-center">
            {invitation.thankYou ? <p className="mx-auto max-w-sm font-cormorant text-2xl italic leading-9" style={{ color: INK }}>{invitation.thankYou}</p> : null}
            <p className="mt-8 font-cormorant text-3xl" style={{ color: INK }}>
              {names}
            </p>
            <p className="mt-6 text-[11px] uppercase tracking-[0.28em]" style={{ color: GOLD }}>
              Golden Letter
            </p>
            {showBrand ? <p className="mt-8 text-[11px] uppercase tracking-[0.24em] text-[#55483E]/50">Thiệp tạo trên PICORA</p> : null}
          </Reveal>
        </article>
      ) : null}
      {photoIndex != null ? <Lightbox photos={photos} index={photoIndex} onClose={() => setPhotoIndex(null)} onIndex={setPhotoIndex} /> : null}
      <MusicButton
        url={invitation.musicUrl}
        className="fixed bottom-5 right-5 z-20 rounded-full border border-[#B99A62]/40 bg-[#F7F1E7]/95 px-4 py-2 text-[12px] font-semibold tracking-[0.14em] text-[#49382D] shadow-sm"
      />
    </div>
  );
}
