"use client";

import * as React from "react";
import { resolveAuthUserId, userKeySync } from "@/lib/user-scoped-storage";

/**
 * `useOnboardingDraft` — autosave for the onboarding wizard.
 *
 * Storage modes
 * -------------
 * 1. **LS-only** (default). Persists to `localStorage` only. Survives refreshes
 *    on the same device.
 * 2. **LS + server** (enabled when `NEXT_PUBLIC_ONBOARDING_DRAFT_SERVER` is set
 *    to `"1"` or `"true"`). Mirrors every save to
 *    `PUT /api/v1/users/me/onboarding-draft`. On hydration we compare local
 *    vs server `updated_at` and the **newer** record wins (server preferred on
 *    ties). This lets users resume on a different device.
 *
 * Both modes expose the same surface (`data`, `setData`, `flush`, `clear`,
 * `status`, `lastSavedAt`, `lastError`) so call sites do not change.
 *
 * Status transitions
 * ------------------
 *   idle → saving (debounce window) → saved (LS ok and (server ok | server off))
 *                                  ↘ error (LS quota or server PUT failed)
 *
 * On server failure the local copy is still durable; the wizard surfaces the
 * error via `InlineNotice` and the next user keystroke retries the PUT.
 *
 * Privacy: storage key is scoped per authenticated user via
 * `userKeySync(userId, "onboarding-draft")` so user-A's draft cannot be read
 * by user-B after a logout/login cycle on the same device.
 */

const STORAGE_BUCKET = "onboarding-draft";
const DEBOUNCE_MS = 1500;
const SCHEMA_VERSION = 1;
const SERVER_ENDPOINT = "/api/v1/users/me/onboarding-draft";

const SERVER_ENABLED = (() => {
  const raw =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_ONBOARDING_DRAFT_SERVER
      : undefined;
  return raw === "1" || raw === "true";
})();

export type DraftStatus = "idle" | "saving" | "saved" | "error";

interface PersistedDraft<TData> {
  schemaVersion: number;
  updatedAt: string;
  data: TData;
}

interface ServerDraftEnvelope<TData> {
  data?: { data?: TData; updated_at?: string } | null;
}

export interface UseOnboardingDraftResult<TData> {
  /** The currently-known draft data (post-hydration). */
  data: TData;
  /** True until the LS hydration pass completes — defer rendering until then. */
  hydrated: boolean;
  /**
   * Set the next draft value. Accepts a value or an updater fn (React-style).
   * Schedules a debounced save automatically.
   */
  setData: React.Dispatch<React.SetStateAction<TData>>;
  /** Flush any pending save synchronously. Useful before navigating away. */
  flush: () => void;
  /** Wipe the draft from the device (and server if server mode is on). */
  clear: () => void;
  status: DraftStatus;
  lastSavedAt: Date | null;
  /** Last error captured during save — surface this to the user. */
  lastError: Error | null;
}

function readDraft<TData>(
  storageKey: string | null,
  initial: TData,
): { data: TData; updatedAt: Date | null } {
  if (typeof window === "undefined" || !storageKey) {
    return { data: initial, updatedAt: null };
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { data: initial, updatedAt: null };
    const parsed = JSON.parse(raw) as PersistedDraft<TData>;
    if (!parsed || typeof parsed !== "object") return { data: initial, updatedAt: null };
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      return { data: initial, updatedAt: null };
    }
    return {
      data: { ...initial, ...(parsed.data as TData) },
      updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : null,
    };
  } catch {
    return { data: initial, updatedAt: null };
  }
}

function writeDraftToLS<TData>(storageKey: string | null, next: TData, updatedAt: string): void {
  if (typeof window === "undefined" || !storageKey) return;
  const payload: PersistedDraft<TData> = {
    schemaVersion: SCHEMA_VERSION,
    updatedAt,
    data: next,
  };
  window.localStorage.setItem(storageKey, JSON.stringify(payload));
}

export function useOnboardingDraft<TData extends object>(
  initial: TData,
): UseOnboardingDraftResult<TData> {
  const [data, setDataState] = React.useState<TData>(initial);
  const [hydrated, setHydrated] = React.useState(false);
  const [status, setStatus] = React.useState<DraftStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);
  const [lastError, setLastError] = React.useState<Error | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = React.useRef<TData | null>(null);
  const serverInflightRef = React.useRef<AbortController | null>(null);
  // Resolved on first mount once the BFF session lookup completes.
  // While `null` we hold off on writes so we never persist under the wrong
  // user id (avoids the cross-user PHI leak fixed in this hotfix).
  const storageKeyRef = React.useRef<string | null>(null);

  // Hydrate from localStorage first (after resolving the per-user key), then
  // optionally reconcile with server.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const userId = await resolveAuthUserId();
      if (cancelled) return;
      const storageKey = userKeySync(userId, STORAGE_BUCKET);
      storageKeyRef.current = storageKey;

      const { data: localData, updatedAt: localUpdatedAt } = readDraft(storageKey, initial);
      if (cancelled) return;
      setDataState(localData);
      setLastSavedAt(localUpdatedAt);
      setHydrated(true);

      if (!SERVER_ENABLED || typeof window === "undefined") return;

      try {
        const res = await fetch(SERVER_ENDPOINT, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return; // 404 or auth error → keep local copy
        const json = (await res.json()) as ServerDraftEnvelope<TData>;
        const serverData = json?.data?.data;
        const serverUpdatedAt = json?.data?.updated_at
          ? new Date(json.data.updated_at)
          : null;
        if (cancelled || !serverData || !serverUpdatedAt) return;
        // Server wins on tie ("server timestamp wins" per plan §B.2).
        if (!localUpdatedAt || serverUpdatedAt >= localUpdatedAt) {
          const merged = { ...initial, ...(serverData as TData) };
          setDataState(merged);
          setLastSavedAt(serverUpdatedAt);
          writeDraftToLS(storageKey, merged, serverUpdatedAt.toISOString());
        }
      } catch {
        /* network blip — keep local copy */
      }
    })();
    return () => {
      cancelled = true;
    };
    // We intentionally only read `initial` once on mount — callers should not
    // mutate the initial reference between renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = React.useCallback((next: TData) => {
    if (typeof window === "undefined") return;
    const storageKey = storageKeyRef.current;
    if (!storageKey) {
      // We haven't resolved the per-user storage key yet; keep the value in
      // memory and let the next setData/persist cycle write it.
      return;
    }
    let updatedAtIso: string;
    try {
      updatedAtIso = new Date().toISOString();
      writeDraftToLS(storageKey, next, updatedAtIso);
      setLastSavedAt(new Date(updatedAtIso));
      setLastError(null);
    } catch (err) {
      setStatus("error");
      setLastError(err instanceof Error ? err : new Error("Failed to save draft"));
      return;
    }

    if (!SERVER_ENABLED) {
      setStatus("saved");
      return;
    }

    setStatus("saving");
    if (serverInflightRef.current) serverInflightRef.current.abort();
    const ctrl = new AbortController();
    serverInflightRef.current = ctrl;

    fetch(SERVER_ENDPOINT, {
      method: "PUT",
      credentials: "include",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: next, updated_at: updatedAtIso }),
      signal: ctrl.signal,
    })
      .then((res) => {
        if (ctrl.signal.aborted) return;
        if (!res.ok) {
          throw new Error(`PUT /onboarding-draft failed (${res.status})`);
        }
        setStatus("saved");
        setLastError(null);
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setStatus("error");
        setLastError(err instanceof Error ? err : new Error("Server save failed"));
      });
  }, []);

  const flush = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (pendingRef.current) {
      const toPersist = pendingRef.current;
      pendingRef.current = null;
      persist(toPersist);
    }
  }, [persist]);

  const setData = React.useCallback<React.Dispatch<React.SetStateAction<TData>>>(
    (updater) => {
      setDataState((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (p: TData) => TData)(prev)
            : updater;
        pendingRef.current = next;
        setStatus("saving");
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          if (pendingRef.current) {
            persist(pendingRef.current);
            pendingRef.current = null;
          }
        }, DEBOUNCE_MS);
        return next;
      });
    },
    [persist],
  );

  const clear = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingRef.current = null;
    if (serverInflightRef.current) {
      serverInflightRef.current.abort();
      serverInflightRef.current = null;
    }
    if (typeof window !== "undefined") {
      const storageKey = storageKeyRef.current;
      if (storageKey) {
        try {
          window.localStorage.removeItem(storageKey);
        } catch {
          /* ignore */
        }
      }
    }
    setLastSavedAt(null);
    setStatus("idle");
    setLastError(null);

    if (SERVER_ENABLED && typeof window !== "undefined") {
      // Best-effort cleanup; ignore failures (Core may already have dropped it
      // on completion, or the endpoint may not be live yet).
      void fetch(SERVER_ENDPOINT, {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
      }).catch(() => undefined);
    }
  }, []);

  // Persist on unmount/visibility-change so we don't lose in-flight edits.
  React.useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") flush();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [flush]);

  return { data, hydrated, setData, flush, clear, status, lastSavedAt, lastError };
}
