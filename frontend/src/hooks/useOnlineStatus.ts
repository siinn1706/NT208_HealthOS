"use client";

/**
 * useOnlineStatus — tracks the browser's network connectivity via the
 * `navigator.onLine` property and the `online` / `offline` window events.
 *
 * `navigator.onLine` is intentionally *advisory only* — a value of `true` does
 * not guarantee internet access (the device might be on a captive portal or
 * dead Wi-Fi), but a value of `false` is reliable enough to drive offline UX
 * (queue outbound chat messages, show the "you're offline" banner).
 *
 * SSR-safe: defaults to `true` on the server so first paint doesn't flash an
 * "offline" banner before hydration finishes.
 */

import { useEffect, useState } from "react";

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator === "undefined") return true;
    return navigator.onLine;
  });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return isOnline;
}
