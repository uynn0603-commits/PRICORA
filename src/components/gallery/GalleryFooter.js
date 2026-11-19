import { getSettings } from "../../data/store.js";
import { esc } from "../../utils/format.js";
import { logoLockup } from "../logo.js";

const TONES = {
  ivory: { wrap: "border-[#EAE5DC] text-[#29251F]", muted: "text-[#29251F]/60", slogan: "font-playfair italic" },
  paper: { wrap: "border-[#222]/15 text-[#222]", muted: "text-[#222]/60", slogan: "font-cormorant italic text-lg" },
  light: { wrap: "border-[#EBEAF1] text-[#202124]", muted: "text-[#5F6368]", slogan: "" },
  dark: { wrap: "border-white/10 text-white", muted: "text-[#A1A1A1]", slogan: "font-cormorant italic text-lg" },
};

export function galleryFooter({ tone = "light" } = {}) {
  const settings = getSettings();
  const style = TONES[tone] || TONES.light;
  const dark = tone === "dark";
  return `
    <footer class="border-t px-6 py-12 text-center ${style.wrap}">
      <div class="flex justify-center">${logoLockup({ size: 24, compact: true, tone: dark ? "dark" : "light", mono: dark })}</div>
      <p class="mt-4 ${style.slogan} ${style.muted}">${esc(settings.slogan || "Your Photos. Your Memories.")}</p>
      <p class="mt-2 text-[11px] uppercase tracking-[0.2em] ${style.muted}">Vận hành bởi ${esc(settings.platformName || "PICORA")}</p>
    </footer>`;
}
