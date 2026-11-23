import { useId } from "react";
import { cn, initials } from "@/lib/format";

const P_SHAPE =
  "M10 18a10 10 0 0 1 10-10h24a12 12 0 0 1 12 12v12a12 12 0 0 1-12 12H26v9a7 7 0 0 1-7 7h-4a5 5 0 0 1-5-5z";
const WINDOW = "M22 15h22a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V19a4 4 0 0 1 4-4z";

export const PLATFORM_NAME = "PICORA";

type Tone = "light" | "dark";

export function LogoMark({ size = 34, mono = false }: { size?: number; mono?: boolean }) {
  const id = `picoramark${useId().replace(/:/g, "")}`;
  if (mono) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path fill="currentColor" fillRule="evenodd" d={`${P_SHAPE}${WINDOW}`} />
        <circle cx="40" cy="21" r="2.6" fill="currentColor" />
        <path d="M21.5 34.5 28 28l5 5 4-4 8 5.5z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="8" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7552F6" />
          <stop offset="1" stopColor="#C94DEB" />
        </linearGradient>
      </defs>
      <path fill={`url(#${id})`} d={P_SHAPE} />
      <rect x="18" y="15" width="30" height="22" rx="4" fill="#fff" />
      <circle cx="40" cy="21" r="3" fill="#FFB547" />
      <path d="M20.5 35.5 28 27l5 5 4-4 9 7.5z" fill="#7552F6" />
      <path d="M58 3.5 59 6.8l3.3 1-3.3 1L58 12.2l-1-3.4-3.3-1 3.3-1z" fill="#FFB547" />
    </svg>
  );
}

function Wordmark({ name, tone, compact }: { name: string; tone: Tone; compact: boolean }) {
  return (
    <span
      className={cn(
        "truncate font-bold uppercase leading-none",
        compact ? "text-[13px] tracking-[0.18em]" : "text-[19px] tracking-[0.06em]",
        tone === "dark" ? "text-white" : "text-ink",
      )}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {name}
    </span>
  );
}

interface LockupProps {
  tone?: Tone;
  size?: number;
  compact?: boolean;
  mono?: boolean;
}

export function LogoLockup({ tone = "light", size = 34, compact = false, mono = false }: LockupProps) {
  return (
    <span className={cn("inline-flex min-w-0 items-center", compact ? "gap-2" : "gap-2.5")}>
      <span className={cn("inline-flex shrink-0", mono && (tone === "dark" ? "text-white" : "text-ink"))}>
        <LogoMark size={size} mono={mono} />
      </span>
      <Wordmark name={PLATFORM_NAME} tone={tone} compact={compact} />
    </span>
  );
}

export interface BrandLike {
  name?: string;
  logoDataUrl?: string;
  settings?: { logoDataUrl?: string };
}

// A studio's own symbol: the uploaded logo, or its initials on the brand colour.
export function StudioMark({ studio, size = 34, mono = false, tone = "light" }: { studio: BrandLike | null | undefined; size?: number; mono?: boolean; tone?: Tone }) {
  const logo = studio?.logoDataUrl || studio?.settings?.logoDataUrl;
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt="" className="shrink-0 rounded-lg object-cover" style={{ width: size, height: size }} />;
  }
  const fill = mono ? (tone === "dark" ? "border border-white/60 text-white" : "border border-current") : "bg-primary text-white";
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-lg font-semibold", fill)} style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>
      {initials(studio?.name || PLATFORM_NAME)}
    </span>
  );
}

// Gallery headers and footers carry the studio's brand. Without a studio (template
// demos), they fall back to the PICORA mark.
export function StudioLockup({ studio, tone = "light", size = 34, compact = false, mono = false }: LockupProps & { studio: BrandLike | null | undefined }) {
  if (!studio) return <LogoLockup tone={tone} size={size} compact={compact} mono={mono} />;
  return (
    <span className={cn("inline-flex min-w-0 items-center", compact ? "gap-2" : "gap-2.5")}>
      <StudioMark studio={studio} size={size} mono={mono} tone={tone} />
      <Wordmark name={studio.name || ""} tone={tone} compact={compact} />
    </span>
  );
}
