"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getVersion, subscribe } from "./store";

// Re-renders the calling component whenever the local database or session changes.
// Components read data through the plain store functions after calling this.
export function useStore(): number {
  return useSyncExternalStore(subscribe, getVersion, () => 0);
}

export function useTitle(title: string) {
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);
}
