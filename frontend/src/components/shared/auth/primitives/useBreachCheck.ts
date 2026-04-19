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
 * Debounced HIBP breach check using k-anonymity.
 *
 * The browser computes `SHA1(password).upper()` locally, sends only the first
 * 5 hex characters to the BFF (`GET /api/v1/auth/check-password-breach/range/<5hex>`),
 * and matches the suffix against the returned newline-separated `SUFFIX:COUNT`
 * list. The plaintext password NEVER leaves the browser — the network, BFF,
 * Core BE, and any access logs only see the 5-char prefix.
 *
 * Failures degrade silently to `status: "error"` so the form remains
 * submittable — Core BE still validates the password on submit.
 */
export function useBreachCheck(
  password: string,
  { minLength = 8, debounceMs = 1000 }: UseBreachCheckOptions = {},
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
        // Hash with the platform crypto first; if SubtleCrypto is unavailable
        // (very old browsers / non-secure contexts) we cannot safely fall back
        // to sending the plaintext, so the helper degrades to `error` instead.
        if (
          typeof crypto === "undefined" ||
          typeof crypto.subtle === "undefined" ||
          typeof crypto.subtle.digest !== "function"
        ) {
          setStatus("error");
          setCount(null);
          return;
        }

        const buf = await crypto.subtle.digest(
          "SHA-1",
          new TextEncoder().encode(password),
        );
        const hex = Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase();
        const prefix = hex.slice(0, 5);
        const suffix = hex.slice(5);

        const res = await fetch(
          `/api/v1/auth/check-password-breach/range/${prefix}`,
          { signal: controller.signal, credentials: "include" },
        );

        if (!res.ok) {
          setStatus("error");
          setCount(null);
          return;
        }

        const text = await res.text();
        // Each line is `SUFFIX:COUNT`. The HIBP service returns SUFFIX in
        // upper-case, but normalise just in case.
        let matchCount: number | null = null;
        for (const line of text.split(/\r?\n/)) {
          const sep = line.indexOf(":");
          if (sep === -1) continue;
          const lineSuffix = line.slice(0, sep).trim().toUpperCase();
          if (lineSuffix === suffix) {
            const c = Number(line.slice(sep + 1).trim());
            matchCount = Number.isFinite(c) ? c : null;
            break;
          }
        }
        setCount(matchCount);
        setStatus(matchCount && matchCount > 0 ? "breached" : "safe");
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
