"use client";

import { useEffect, useRef, useState } from "react";

export type BreachStatus = "idle" | "checking" | "safe" | "breached" | "error";

interface UseBreachCheckOptions {
  /** Minimum password length before we bother calling HIBP. */
  minLength?: number;
  /** Debounce window in ms. */
  debounceMs?: number;
}

interface BreachCheckResult {
  status: BreachStatus;
  /** HIBP returns the number of times the password appeared in known breaches. */
  count: number | null;
  /** Convenience flag — true only when we have a confirmed positive match. */
  isBreached: boolean;
}

/**
 * Debounced HIBP breach check.
 *
 * Calls the BFF `/api/v1/auth/check-password-breach` endpoint after a short
 * idle window to avoid spamming the API on every keystroke. Failures degrade
 * silently to `status: "error"` so the form remains submittable — Core BE
 * still validates the password on submit.
 */
export function useBreachCheck(
  password: string,
  { minLength = 8, debounceMs = 500 }: UseBreachCheckOptions = {},
): BreachCheckResult {
  const [status, setStatus] = useState<BreachStatus>("idle");
  const [count, setCount] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (!password || password.length < minLength) {
      setStatus("idle");
      setCount(null);
      return;
    }

    setStatus("checking");

    timeoutRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch("/api/v1/auth/check-password-breach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
          signal: controller.signal,
          credentials: "include",
        });

        if (!res.ok) {
          setStatus("error");
          setCount(null);
          return;
        }

        const json = (await res.json().catch(() => null)) as
          | { data?: { breached?: boolean; count?: number } }
          | null;

        const breached = Boolean(json?.data?.breached);
        const c = typeof json?.data?.count === "number" ? json.data!.count! : null;
        setCount(c);
        setStatus(breached ? "breached" : "safe");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setStatus("error");
        setCount(null);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [password, minLength, debounceMs]);

  return { status, count, isBreached: status === "breached" };
}
