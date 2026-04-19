"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_PREFIX = "auth.cooldown.";

function loadDeadline(key: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return 0;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return 0;
    return parsed;
  } catch {
    return 0;
  }
}

function persistDeadline(key: string, deadline: number) {
  if (typeof window === "undefined") return;
  try {
    if (deadline <= Date.now()) {
      window.localStorage.removeItem(STORAGE_PREFIX + key);
    } else {
      window.localStorage.setItem(STORAGE_PREFIX + key, String(deadline));
    }
  } catch {
    /* ignore */
  }
}

/**
 * Persistent OTP-resend cooldown. The remaining time survives reloads so a
 * user can't spam resend by refreshing the page.
 *
 * @param key   stable identity for the cooldown bucket (e.g. `resend:${email}`)
 * @param seconds default cooldown window when calling `arm()` without a value
 */
export function useResendCooldown(key: string, seconds = 60) {
  const [remaining, setRemaining] = useState<number>(() => {
    const deadline = loadDeadline(key);
    return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  });
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const deadline = loadDeadline(key);
    const initial = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    setRemaining(initial);
  }, [key]);

  useEffect(() => {
    if (remaining <= 0) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = window.setInterval(() => {
      const deadline = loadDeadline(key);
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(next);
    }, 1000);
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [remaining, key]);

  const arm = useCallback(
    (overrideSeconds?: number) => {
      const ttl = overrideSeconds ?? seconds;
      const deadline = Date.now() + ttl * 1000;
      persistDeadline(key, deadline);
      setRemaining(ttl);
    },
    [key, seconds],
  );

  const clear = useCallback(() => {
    persistDeadline(key, 0);
    setRemaining(0);
  }, [key]);

  return {
    remaining,
    canResend: remaining <= 0,
    arm,
    clear,
  };
}
