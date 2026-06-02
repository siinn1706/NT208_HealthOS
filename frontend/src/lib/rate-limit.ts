/**
 * In-memory token-bucket rate limiter for AI inference BFF endpoints.
 *
 * Intentionally lightweight — no Redis, no distributed coordination.
 * Each Next.js worker process has its own bucket map, which is acceptable
 * for GPU/AI worker protection where approximate limiting is sufficient.
 *
 * Key is caller-supplied (e.g. `analyze-photo:sha256(sessionToken)`).
 * Tokens refill one-per-refillIntervalMs up to burst cap.
 */

interface BucketState {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, BucketState>();

// Evict buckets inactive for more than 10 minutes every 5 minutes
// to prevent unbounded map growth in long-running worker processes.
const EVICT_INTERVAL_MS = 5 * 60 * 1000;
const BUCKET_TTL_MS = 10 * 60 * 1000;

const evictTimer = setInterval(() => {
  const cutoff = Date.now() - BUCKET_TTL_MS;
  for (const [key, bucket] of buckets) {
    if (bucket.lastRefill < cutoff) buckets.delete(key);
  }
}, EVICT_INTERVAL_MS);

// Allow the timer to be GC-d in test environments so the process can exit cleanly.
if (typeof evictTimer.unref === "function") evictTimer.unref();

export interface RateLimitOpts {
  /** Maximum burst size — tokens available after a cold start. */
  burst: number;
  /** Milliseconds between token refills (1 token per interval). */
  refillIntervalMs: number;
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterMs: number };

/**
 * Attempt to consume one token from the named bucket.
 *
 * Returns `{ ok: true }` when a token is available,
 * or `{ ok: false, retryAfterMs }` when the bucket is empty.
 */
export function takeToken(key: string, opts: RateLimitOpts): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    // First request: start with a full burst minus the token we're about to consume.
    bucket = { tokens: opts.burst - 1, lastRefill: now };
    buckets.set(key, bucket);
    return { ok: true };
  }

  // Refill: add one token per completed refill interval since lastRefill.
  const elapsed = now - bucket.lastRefill;
  const refills = Math.floor(elapsed / opts.refillIntervalMs);
  if (refills > 0) {
    bucket.tokens = Math.min(opts.burst, bucket.tokens + refills);
    bucket.lastRefill = now;
  }

  if (bucket.tokens > 0) {
    bucket.tokens--;
    return { ok: true };
  }

  // Time until next token: remainder of the current refill interval.
  const elapsedInCurrentInterval = elapsed % opts.refillIntervalMs;
  const retryAfterMs = opts.refillIntervalMs - elapsedInCurrentInterval;
  return { ok: false, retryAfterMs };
}

// ── Test helpers ─────────────────────────────────────────────────────────────

/** Reset all buckets — only available in test environments. */
export function __resetBucketsForTests(): void {
  if (process.env.VITEST !== "true" && process.env.NODE_ENV !== "test") return;
  buckets.clear();
}
