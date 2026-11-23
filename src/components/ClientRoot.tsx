"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BROKEN_IMAGE } from "@/lib/media";
import { closeTransient } from "@/lib/overlay";
import { applyBrand, getSettings, hydrate } from "@/lib/store";
import { closeLightbox, LightboxHost } from "./gallery/PhotoLightbox";
import { OverlayHost } from "./ui/OverlayHost";

// Pages read the store synchronously, so nothing renders until the browser has loaded
// the signed-in account from the API.
export function ClientRoot({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    void hydrate().then(() => {
      if (!location.pathname.startsWith("/s/")) applyBrand(getSettings());
      setMounted(true);
    });
    const onError = (event: Event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement) || image.dataset.fallback === "1") return;
      image.dataset.fallback = "1";
      image.src = BROKEN_IMAGE;
    };
    document.addEventListener("error", onError, true);
    return () => document.removeEventListener("error", onError, true);
  }, []);

  // Gallery pages apply the brand of the studio that owns the album themselves.
  useEffect(() => {
    closeTransient();
    closeLightbox();
    if (!pathname.startsWith("/s/")) applyBrand(getSettings());
    document.documentElement.classList.toggle("is-embedded", new URLSearchParams(location.search).get("embed") === "1");
  }, [pathname]);

  if (!mounted) return null;
  return (
    <>
      <Suspense fallback={null}>{children}</Suspense>
      <OverlayHost />
      <LightboxHost />
    </>
  );
}
