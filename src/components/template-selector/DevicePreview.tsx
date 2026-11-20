"use client";

import { useLayoutEffect, useRef } from "react";

const PHONE = { width: 414, height: 868 };

export type Device = "desktop" | "mobile";

// Frames a live page in a browser window or a phone. The page itself runs in an iframe,
// so templates respond to a real viewport width instead of a simulated one. The phone
// always renders a 390px viewport and is scaled down as a whole to fit the screen.
export function DevicePreview({ src, device = "desktop" }: { src: string; device?: Device }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (device !== "mobile") return;
    const fit = () => {
      const stage = stageRef.current;
      const phone = phoneRef.current;
      if (!stage || !phone) return;
      const scale = Math.min(1, stage.clientHeight / PHONE.height, stage.clientWidth / PHONE.width);
      phone.style.transform = `scale(${scale})`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [device]);

  if (device === "mobile") {
    return (
      <div ref={stageRef} className="flex h-full items-start justify-center overflow-hidden">
        <div
          ref={phoneRef}
          className="relative shrink-0 origin-top rounded-[48px] bg-[#0E0D14] p-3 shadow-2xl ring-1 ring-white/10"
          style={{ width: PHONE.width, height: PHONE.height }}
        >
          <div className="absolute left-1/2 top-4 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#0E0D14]" />
          <iframe src={src} title="Xem trước trên điện thoại" className="h-full w-full rounded-[38px] bg-white" />
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-white/10">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-line bg-[#F3F3F7] px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-3 h-5 flex-1 truncate rounded-md bg-white px-3 text-[11px] leading-5 text-mist">{location.origin + src.replace(/[?&]embed=1/, "")}</span>
      </div>
      <iframe src={src} title="Xem trước trên máy tính" className="min-h-0 w-full flex-1 bg-white" />
    </div>
  );
}
