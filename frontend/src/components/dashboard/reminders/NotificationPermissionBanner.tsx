"use client";

import { useState, useSyncExternalStore } from "react";

import { PermissionBanner } from "@/components/ui/permission-banner";

const DISMISS_KEY = "healthos:reminders:notif-banner-dismissed";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeToStorage(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

/**
 * Reminders-page wrapper around `<PermissionBanner kind="notifications">`.
 *
 * - Prompts the user to enable browser notifications.
 * - Once dismissed, the choice is persisted to `localStorage` so the banner
 *   does not re-appear on every navigation. We use `useSyncExternalStore` to
 *   read it without an effect-driven cascade and to stay SSR-safe.
 * - When the user later re-grants permission elsewhere the banner stops
 *   rendering naturally because the underlying primitive checks
 *   `Notification.permission` on mount.
 *
 * The plan (sub-plan F §3.2) specifies persistence in user preferences. We
 * intentionally use `localStorage` for now to keep this UI-only and unblock
 * cooking; a follow-up PR can swap to `/api/v1/preferences/me` when the BE
 * adds a `dismissedBanners` key.
 */
export function NotificationPermissionBanner() {
  const persistedDismissed = useSyncExternalStore(
    subscribeToStorage,
    readDismissed,
    () => false,
  );
  const [dismissed, setDismissed] = useState(false);

  if (persistedDismissed || dismissed) return null;

  return (
    <PermissionBanner
      kind="notifications"
      onDismiss={() => {
        try {
          localStorage.setItem(DISMISS_KEY, "1");
        } catch {
          // localStorage may be unavailable (private mode); just hide for now.
        }
        setDismissed(true);
      }}
    />
  );
}
