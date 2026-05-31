"use client";

import { useSyncExternalStore } from "react";

/**
 * Returns true when the user has requested reduced motion via OS/browser settings.
 * Updates reactively if the preference changes while the page is open.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      const handler = () => onStoreChange();
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    },
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}
