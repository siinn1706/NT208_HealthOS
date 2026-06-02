/**
 * Unit tests for the in-memory token-bucket rate limiter (src/lib/rate-limit.ts).
 *
 * Covers:
 *   - Bucket depletes after burst is exhausted
 *   - Token refills after the refill interval elapses
 *   - Different keys are fully independent (no cross-bucket leakage)
 *   - retryAfterMs is > 0 and ≤ refillIntervalMs when blocked
 *   - First request on a fresh bucket always succeeds
 */

import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { takeToken, __resetBucketsForTests } from "@/lib/rate-limit";

const OPTS = { burst: 3, refillIntervalMs: 10_000 } as const;

beforeEach(() => {
  __resetBucketsForTests();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Happy path ────────────────────────────────────────────────────────────────

describe("takeToken — happy path", () => {
  it("first request on a cold bucket succeeds", () => {
    const result = takeToken("key:cold", OPTS);
    expect(result.ok).toBe(true);
  });

  it("allows exactly `burst` requests before blocking", () => {
    const key = "key:burst-exact";
    for (let i = 0; i < OPTS.burst; i++) {
      const result = takeToken(key, OPTS);
      expect(result.ok, `request ${i + 1} should succeed`).toBe(true);
    }
    // burst+1 should be blocked
    const blocked = takeToken(key, OPTS);
    expect(blocked.ok).toBe(false);
  });
});

// ── Depletion ─────────────────────────────────────────────────────────────────

describe("takeToken — bucket depletion", () => {
  it("blocks on burst+1 and returns retryAfterMs > 0", () => {
    const key = "key:depleted";
    for (let i = 0; i < OPTS.burst; i++) takeToken(key, OPTS);
    const result = takeToken(key, OPTS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryAfterMs).toBeGreaterThan(0);
      expect(result.retryAfterMs).toBeLessThanOrEqual(OPTS.refillIntervalMs);
    }
  });

  it("retryAfterMs reflects time remaining in current refill interval", () => {
    const key = "key:retry-after-timing";
    // Exhaust the bucket
    for (let i = 0; i < OPTS.burst; i++) takeToken(key, OPTS);

    // Advance 3 000 ms into the 10 000 ms refill interval (no full refill yet)
    vi.advanceTimersByTime(3_000);

    const result = takeToken(key, OPTS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Remaining ≈ 7 000 ms; allow ±50 ms for rounding
      expect(result.retryAfterMs).toBeGreaterThanOrEqual(6_900);
      expect(result.retryAfterMs).toBeLessThanOrEqual(7_100);
    }
  });
});

// ── Refill ────────────────────────────────────────────────────────────────────

describe("takeToken — token refill", () => {
  it("allows requests again after one full refill interval", () => {
    const key = "key:refill-basic";
    for (let i = 0; i < OPTS.burst; i++) takeToken(key, OPTS);
    expect(takeToken(key, OPTS).ok).toBe(false);

    // Advance one full interval → 1 token refilled
    vi.advanceTimersByTime(OPTS.refillIntervalMs);

    expect(takeToken(key, OPTS).ok).toBe(true);
  });

  it("refills multiple tokens after multiple intervals", () => {
    const key = "key:refill-multi";
    for (let i = 0; i < OPTS.burst; i++) takeToken(key, OPTS);
    expect(takeToken(key, OPTS).ok).toBe(false);

    // Advance 2 intervals → 2 tokens refilled
    vi.advanceTimersByTime(OPTS.refillIntervalMs * 2);

    expect(takeToken(key, OPTS).ok).toBe(true);
    expect(takeToken(key, OPTS).ok).toBe(true);
    // Third would deplete again (only 2 were refilled)
    expect(takeToken(key, OPTS).ok).toBe(false);
  });

  it("does not refill beyond burst cap", () => {
    const key = "key:refill-cap";
    // One token consumed
    takeToken(key, OPTS);
    // Wait many intervals — should never exceed burst
    vi.advanceTimersByTime(OPTS.refillIntervalMs * 100);

    // Should allow exactly burst requests (not burst + 100)
    for (let i = 0; i < OPTS.burst; i++) {
      expect(takeToken(key, OPTS).ok, `request ${i + 1} after long wait`).toBe(true);
    }
    expect(takeToken(key, OPTS).ok).toBe(false);
  });
});

// ── Key isolation ─────────────────────────────────────────────────────────────

describe("takeToken — key isolation", () => {
  it("different keys maintain independent buckets", () => {
    const keyA = "key:iso-a";
    const keyB = "key:iso-b";

    // Exhaust keyA
    for (let i = 0; i < OPTS.burst; i++) takeToken(keyA, OPTS);
    expect(takeToken(keyA, OPTS).ok).toBe(false);

    // keyB is unaffected
    expect(takeToken(keyB, OPTS).ok).toBe(true);
  });

  it("analyze-photo and chat-stream buckets are independent", () => {
    const photoKey = "analyze-photo:session-abc";
    const streamKey = "chat-stream:session-abc";
    const opts = { burst: 2, refillIntervalMs: 5_000 };

    // Exhaust photo bucket
    for (let i = 0; i < opts.burst; i++) takeToken(photoKey, opts);
    expect(takeToken(photoKey, opts).ok).toBe(false);

    // Stream bucket for same session key is unaffected
    expect(takeToken(streamKey, opts).ok).toBe(true);
  });
});
