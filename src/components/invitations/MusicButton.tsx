"use client";

import { useRef, useState } from "react";

// Autoplay is blocked on phones, so the guest starts the music themselves.
export function MusicButton({ url, className }: { url: string; className?: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  if (!url) return null;

  const toggle = () => {
    const node = audio.current;
    if (!node) return;
    if (playing) {
      node.pause();
      setPlaying(false);
      return;
    }
    void node.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
  };

  return (
    <>
      <audio ref={audio} src={url} loop preload="none" />
      <button
        type="button"
        onClick={toggle}
        className={className || "fixed bottom-5 right-5 z-20 rounded-full border border-[#E4D8C8] bg-[#FBF7F2]/95 px-4 py-2 text-[12px] font-semibold tracking-wide text-[#2C241C] shadow-sm"}
      >
        {playing ? "Tắt nhạc" : "Bật nhạc"}
      </button>
    </>
  );
}
