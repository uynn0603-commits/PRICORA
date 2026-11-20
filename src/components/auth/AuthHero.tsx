import { LogoLockup } from "@/components/ui/Logo";

export const HERO = "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1800&q=80";
export const PLATFORM_SLOGAN = "Your Photos. Your Memories.";

export function AuthHero({ title }: { title: string }) {
  return (
    <section className="relative hidden min-h-screen lg:block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={HERO} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-ink/30"></div>
      <div className="relative flex h-full flex-col justify-between p-10 text-white">
        <LogoLockup tone="dark" size={40} />
        <div className="max-w-md">
          <p className="text-4xl font-semibold leading-tight tracking-tight">{title}</p>
          <p className="mt-4 text-sm text-white/75">{PLATFORM_SLOGAN}</p>
        </div>
      </div>
    </section>
  );
}
