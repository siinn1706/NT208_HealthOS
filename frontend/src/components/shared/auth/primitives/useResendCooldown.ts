"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { userKeySync } from "@/lib/user-scoped-storage";

const STORAGE_BUCKET = "auth-cooldown";

/**
 * Hash the supplied key (which may contain a raw email such as
 * `otp-resend:user@example.com:signup`) so we never store identifiable
 * material in localStorage. A fast non-crypto hash is sufficient — this
 * value only namespaces a millisecond timestamp and isn't a security boundary.
 */
function hashKey(key: string): string {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function makeStorageKey(rawKey: string): string {
  // The cooldown is generally pre-auth (signup / password reset), so we
  // intentionally pass `null` to userKeySync — it falls back to the `anon`
  // scope which is safe to share across logged-out sessions on the same
  // device. The raw email/identifier is hashed before becoming part of the key.
  return userKeySync(null, STORAGE_BUCKET, hashKey(rawKey));
}

function loadDeadline(rawKey: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(makeStorageKey(rawKey));
    if (!raw) return 0;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return 0;
    return parsed;
  } catch {
    return 0;
  }
}

function persistDeadline(rawKey: string, deadline: number) {
  if (typeof window === "undefined") return;
  const storageKey = makeStorageKey(rawKey);
  try {
    if (deadline <= Date.now()) {
      window.localStorage.removeItem(storageKey);
    } else {
      window.localStorage.setItem(storageKey, String(deadline));
    }
  } catch {
    /* ignore */
  }
}

/**
 * Persistent OTP-resend cooldown. The remaining time survives reloads so a
 * user can't spam resend by refreshing the page.
 *
 * Privacy: the supplied key (which historically embedded a raw email) is
 * hashed before being used as a localStorage key, so the email is never
 * persisted in plaintext where the next user on a shared device could see it.
 *
 * @param key   stable identity for the cooldown bucket (e.g. `otp-resend:${email}:${purpose}`)
 * @param seconds default cooldown window when calling `arm()` without a value
 */
export function useResendCooldown(key: string, seconds = 60) {
  const stableKey = useMemo(() => key, [key]);

  const [remaining, setRemaining] = useState<number>(() => {
    const deadline = loadDeadline(stableKey);
    return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  });
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const deadline = loadDeadline(stableKey);
      const initial = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(initial);
    });
    return () => {
      cancelled = true;
    };
  }, [stableKey]);

  useEffect(() => {
    if (remaining <= 0) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = window.setInterval(() => {
      const deadline = loadDeadline(stableKey);
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(next);
    }, 1000);
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [remaining, stableKey]);

  const arm = useCallback(
    (overrideSeconds?: number) => {
      const ttl = overrideSeconds ?? seconds;
      const deadline = Date.now() + ttl * 1000;
      persistDeadline(stableKey, deadline);
      setRemaining(ttl);
    },
    [stableKey, seconds],
  );

  const clear = useCallback(() => {
    persistDeadline(stableKey, 0);
    setRemaining(0);
  }, [stableKey]);

  return {
    remaining,
    canResend: remaining <= 0,
    arm,
    clear,
  };
}
