import { PLATFORM_NAME, StudioLockup } from "../ui/Logo";

const DEFAULT_SLOGAN = "Your Photos. Your Memories.";

const TONES = {
  ivory: { wrap: "border-[#EAE5DC] text-[#29251F]", muted: "text-[#29251F]/60", slogan: "font-playfair italic" },
  paper: { wrap: "border-[#222]/15 text-[#222]", muted: "text-[#222]/60", slogan: "font-cormorant italic text-lg" },
  light: { wrap: "border-[#EBEAF1] text-[#202124]", muted: "text-[#5F6368]", slogan: "" },
  dark: { wrap: "border-white/10 text-white", muted: "text-[#A1A1A1]", slogan: "font-cormorant italic text-lg" },
};

export type FooterTone = keyof typeof TONES;

export interface FooterStudio {
  name?: string;
  logoDataUrl?: string;
  slogan?: string;
}

export function GalleryFooter({ tone = "light", studio = null }: { tone?: FooterTone; studio?: FooterStudio | null }) {
  const style = TONES[tone] || TONES.light;
  const dark = tone === "dark";
  return (
    <footer className={`border-t px-6 py-12 text-center ${style.wrap}`}>
      <div className="flex justify-center">
        <StudioLockup studio={studio} size={24} compact tone={dark ? "dark" : "light"} mono={dark} />
      </div>
      <p className={`mt-4 ${style.slogan} ${style.muted}`}>{studio?.slogan || DEFAULT_SLOGAN}</p>
      <p className={`mt-2 text-[11px] uppercase tracking-[0.2em] ${style.muted}`}>Vận hành bởi {PLATFORM_NAME}</p>
    </footer>
  );
}
