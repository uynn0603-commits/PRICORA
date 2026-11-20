"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/store";
import { useStore } from "@/lib/use-store";

// Login and signup are for signed-out visitors; a live session goes to its home screen.
// Returns true while redirecting so the page can render nothing.
export function useGuestGuard(): boolean {
  useStore();
  const router = useRouter();
  const session = getSession();
  const home = session ? (session.studioId ? "/admin" : "/platform") : null;

  useEffect(() => {
    if (home) router.replace(home);
  }, [home, router]);

  return Boolean(home);
}
