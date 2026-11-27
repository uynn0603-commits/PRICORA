"use client";

import { useEffect, useState } from "react";

function targetOf(date: string, time: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = (time || "00:00").split(":").map(Number);
  if (!year || !month || !day) return 0;
  return new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0).getTime();
}

function parts(ms: number): Array<{ value: string; label: string }> {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [
    { value: String(days), label: "Ngày" },
    { value: String(hours).padStart(2, "0"), label: "Giờ" },
    { value: String(minutes).padStart(2, "0"), label: "Phút" },
    { value: String(seconds).padStart(2, "0"), label: "Giây" },
  ];
}

export function Countdown({ date, time }: { date: string; time: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!date || now == null) return null;
  const left = targetOf(date, time) - now;
  if (left <= 0) {
    const [year, month, day] = date.split("-").map(Number);
    const wedding = new Date(year, month - 1, day);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const todayWedding = wedding.getTime() === today.getTime();
    return <p className="text-center font-cormorant text-2xl italic text-[#8C1D2C]">{todayWedding ? "Hôm nay là ngày trọng đại" : "Ngày cưới đã qua"}</p>;
  }
  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      {parts(left).map((part) => (
        <div key={part.label} className="rounded-xl border border-[#E4D3C4] bg-white/70 px-2 py-3">
          <p className="font-playfair text-2xl text-[#8C1D2C]">{part.value}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#3A241C]/55">{part.label}</p>
        </div>
      ))}
    </div>
  );
}
