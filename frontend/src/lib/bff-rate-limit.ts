/**
 * BFF rate-limit primitive for public auth routes.
 *
 * Usage:
 *   const limited = await enforceRateLimit(req, RATE_LIMITS["auth:login"]);
 *   if (limited) return limited;
 *
 * Store selection is lazy (RT-7): decided on first call, not at module load.
 * Production without REDIS_URL → 503 on first call + structured log (RT-4).
 * Next.js App Router lazy-evals route modules so module-load throws never fire.
 *
 * IP resolution (RT-3): when IP is unresolvable, fail-OPEN per-request rather
 * than collapsing all unresolvable callers into a shared "unknown" bucket.
 */
import { NextResponse } from "next/server";
import type { StoreResult } from "./bff-rate-limit-store-memory";

// ── Types ────────────────────────────────────────────────────────────────────

export interface RateLimitOptions {
  /** Route identifier, e.g. "auth:login" */
  key: string;
  max: number;
  windowSeconds: number;
  /**
   * Override IP-based principal (e.g. sha256(refresh_token) for /refresh).
   * When provided, IP resolution is skipped entirely.
   */
  principal?: string;
}

interface Store {
  incrWithWindow(key: string, windowSeconds: number): Promise<StoreResult> | StoreResult;
}

// ── Store singleton ──────────────────────────────────────────────────────────

type StoreKind = "redis" | "memory" | "none";

let _store: Store | null | undefined = undefined; // undefined = not yet resolved
let _storeKind: StoreKind = "none";

/**
 * Resolve the backing store lazily on first call.
 * Returns null when production + missing REDIS_URL (signals 503 path).
 */
async function getStore(): Promise<{ store: Store | null; kind: StoreKind }> {
  if (_store !== undefined) return { store: _store, kind: _storeKind };

  const redisUrl = process.env.REDIS_URL;
  const isProd = process.env.NODE_ENV === "production";

  if (redisUrl) {
    const redis = await import("./bff-rate-limit-store-redis");
    _store = { incrWithWindow: redis.incrWithWindow };
    _storeKind = "redis";
    return { store: _store, kind: _storeKind };
  }

  if (isProd) {
    // Production without Redis — return null sentinel; caller emits 503.
    _store = null;
    _storeKind = "none";
    return { store: null, kind: "none" };
  }

  // Non-production fallback — in-memory store.
  const memory = await import("./bff-rate-limit-store-memory");
  _store = { incrWithWindow: (key, win) => memory.incrWithWindow(key, win) };
  _storeKind = "memory";
  return { store: _store, kind: _storeKind };
}

/** Expose current backend kind for the health endpoint. */
export async function getStoreKind(): Promise<StoreKind> {
  const { kind } = await getStore();
  return kind;
}

// ── IP resolution (RT-3) ─────────────────────────────────────────────────────

function resolveClientIp(req: Request): string | null {
  const trustProxy =
    process.env.TRUST_PROXY ?? (process.env.NODE_ENV === "production" ? "1" : "0");

  if (trustProxy === "1") {
    const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (xff) return xff;
    const xri = req.headers.get("x-real-ip");
    if (xri) return xri;
  }
  // No reliable direct-connection IP available in Next.js Web API — fail-OPEN.
  return null;
}

// ── 429 response (canonical contract) ───────────────────────────────────────

/** Canonical 429 body — byte-equal contract locked in phase-4 tests. */
const RATE_LIMIT_BODY = JSON.stringify({
  error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later." },
});

export function rateLimitedResponse(retryAfterSec: number): NextResponse {
  return new NextResponse(RATE_LIMIT_BODY, {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(Math.max(1, Math.ceil(retryAfterSec))),
    },
  });
}

// ── Core enforcer ────────────────────────────────────────────────────────────

const TIMEOUT_MS = 50;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("rate_limit_store_timeout")), ms),
    ),
  ]);
}

export async function enforceRateLimit(
  req: Request,
  opts: RateLimitOptions,
): Promise<NextResponse | null> {
  const principal = opts.principal ?? resolveClientIp(req);

  if (!principal) {
    // Unresolvable IP — fail-OPEN per-request, never collapse into shared bucket.
    console.warn(
      JSON.stringify({
        event: "bff_rate_limit_ip_unresolvable",
        route: opts.key,
      }),
    );
    return null;
  }

  const { store, kind } = await getStore();

  if (!store) {
    // Production + missing REDIS_URL — security gate unavailable.
    console.error(
      JSON.stringify({ event: "bff_rate_limit_unconfigured", route: opts.key }),
    );
    return new NextResponse(
      JSON.stringify({
        error: {
          code: "RATE_LIMIT_UNAVAILABLE",
          message: "Rate limiting is not configured. Service temporarily unavailable.",
        },
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const bucketKey = `rate:bff:${opts.key}:${principal}`;
  const isProd = process.env.NODE_ENV === "production";

  let result: StoreResult;
  try {
    result = await withTimeout(
      Promise.resolve(store.incrWithWindow(bucketKey, opts.windowSeconds)),
      TIMEOUT_MS,
    );
  } catch {
    // Store error or timeout — fail-closed in prod, fail-open in dev.
    if (isProd) {
      console.error(
        JSON.stringify({ event: "bff_rate_limit_store_error", route: opts.key, kind }),
      );
      return new NextResponse(
        JSON.stringify({
          error: {
            code: "RATE_LIMIT_UNAVAILABLE",
            message: "Rate limiting store temporarily unavailable.",
          },
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }
    // Dev — fail-open.
    return null;
  }

  if (result.count > opts.max) {
    const retryAfterSec = Math.max(1, Math.ceil(result.ttlMs / 1000));
    return rateLimitedResponse(retryAfterSec);
  }

  return null;
}

// ── Rate-limit defaults ──────────────────────────────────────────────────────

export const RATE_LIMITS: Record<string, RateLimitOptions> = {
  "auth:login":                   { key: "auth:login",                   max: 10,  windowSeconds: 60 },
  "auth:otp_request":             { key: "auth:otp_request",             max: 5,   windowSeconds: 60 },
  "auth:otp_verify":              { key: "auth:otp_verify",              max: 10,  windowSeconds: 60 },
  "auth:reset_password":          { key: "auth:reset_password",          max: 5,   windowSeconds: 60 },
  "auth:refresh":                 { key: "auth:refresh",                 max: 60,  windowSeconds: 60 },
  "auth:availability_email":      { key: "auth:availability_email",      max: 20,  windowSeconds: 60 },
  "auth:availability_username":   { key: "auth:availability_username",   max: 20,  windowSeconds: 60 },
  "auth:pwned_range_get":         { key: "auth:pwned_range_get",         max: 30,  windowSeconds: 60 },
  "auth:pwned_range_post_legacy": { key: "auth:pwned_range_post_legacy", max: 10,  windowSeconds: 60 },
  "auth:ws_token":                { key: "auth:ws_token",                max: 30,  windowSeconds: 60 },
  "auth:oauth_start":             { key: "auth:oauth_start",             max: 20,  windowSeconds: 60 },
  "auth:mfa_verify":              { key: "auth:mfa_verify",              max: 5,   windowSeconds: 300 },
};

// ── Test helpers (gated on VITEST env — never reachable in production) ───────

export function __setStoreForTests(store: Store | null): void {
  if (process.env.VITEST !== "true") return;
  _store = store;
  _storeKind = store === null ? "none" : "memory";
}

export function __resetStoreForTests(): void {
  if (process.env.VITEST !== "true") return;
  _store = undefined;
  _storeKind = "none";
}
