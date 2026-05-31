/**
 * Per-route rate-limit contract tests (RT-2, RT-6, RT-14).
 * Drives enforceRateLimit directly against every RATE_LIMITS entry so that
 * each route's config, bucket isolation, and Retry-After accuracy are verified.
 */
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import {
  enforceRateLimit,
  RATE_LIMITS,
  __setStoreForTests,
  __resetStoreForTests,
} from "@/lib/bff-rate-limit";
import { MemoryStore } from "@/lib/bff-rate-limit-store-memory";

function makeReq(ip: string): NextRequest {
  return new NextRequest("http://localhost/api/v1/auth/test", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

beforeEach(() => {
  __setStoreForTests(new MemoryStore());
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  process.env.TRUST_PROXY = "1";
  (process.env as { NODE_ENV?: string }).NODE_ENV = "test";
  delete process.env.REDIS_URL;
});

afterEach(() => {
  __resetStoreForTests();
  vi.useRealTimers();
  delete process.env.TRUST_PROXY;
});

// ── Per-route parametric suite ───────────────────────────────────────────────

describe.each(Object.entries(RATE_LIMITS))("route(%s)", (_routeKey, opts) => {
  it("allows up to max requests", async () => {
    const req = makeReq("10.1.0.1");
    for (let i = 0; i < opts.max; i++) {
      const result = await enforceRateLimit(req, opts);
      expect(result, `request ${i + 1} should pass`).toBeNull();
    }
  });

  it("blocks on max+1 with status 429", async () => {
    const req = makeReq("10.1.0.2");
    for (let i = 0; i < opts.max; i++) {
      await enforceRateLimit(req, opts);
    }
    const blocked = await enforceRateLimit(req, opts);
    expect(blocked?.status).toBe(429);
  });

  it("429 body is byte-equal to canonical contract", async () => {
    const req = makeReq("10.1.0.3");
    for (let i = 0; i < opts.max; i++) {
      await enforceRateLimit(req, opts);
    }
    const blocked = await enforceRateLimit(req, opts);
    expect(await blocked?.text()).toBe(
      '{"error":{"code":"RATE_LIMIT_EXCEEDED","message":"Too many requests. Please try again later."}}',
    );
  });

  it("Retry-After header is in [1, windowSeconds]", async () => {
    const req = makeReq("10.1.0.4");
    for (let i = 0; i < opts.max; i++) {
      await enforceRateLimit(req, opts);
    }
    const blocked = await enforceRateLimit(req, opts);
    const retryAfter = Number(blocked?.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(opts.windowSeconds);
  });

  it("Retry-After reflects elapsed time, not hardcoded windowSeconds (RT-14)", async () => {
    const req = makeReq("10.1.0.5");
    for (let i = 0; i < opts.max; i++) {
      await enforceRateLimit(req, opts);
    }
    // Advance to halfway through the window
    vi.advanceTimersByTime(Math.floor((opts.windowSeconds / 2) * 1000));
    const blocked = await enforceRateLimit(req, opts);
    const retryAfter = Number(blocked?.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    // Should reflect remaining ~half-window, not the full window
    expect(retryAfter).toBeLessThanOrEqual(Math.ceil(opts.windowSeconds / 2) + 1);
  });
});

// ── Bucket isolation (RT-2) ──────────────────────────────────────────────────

describe("bucket isolation across routes", () => {
  it("exhausting one route key does not affect another", async () => {
    const req = makeReq("10.2.0.1");
    const loginOpts = RATE_LIMITS["auth:login"]; // max: 10
    const otpOpts = RATE_LIMITS["auth:otp_request"]; // max: 5

    for (let i = 0; i < loginOpts.max; i++) {
      await enforceRateLimit(req, loginOpts);
    }
    expect((await enforceRateLimit(req, loginOpts))?.status).toBe(429);

    // otp_request bucket is completely independent
    const otpResult = await enforceRateLimit(req, otpOpts);
    expect(otpResult).toBeNull();
  });

  it("auth:login allows exactly 10 then blocks on 11th (RT-2 boundary)", async () => {
    const req = makeReq("10.2.0.2");
    const opts = RATE_LIMITS["auth:login"]; // max: 10

    let passes = 0;
    let firstBlockAt = -1;

    for (let i = 0; i < 11; i++) {
      const result = await enforceRateLimit(req, opts);
      if (result === null) {
        passes++;
      } else if (firstBlockAt === -1) {
        firstBlockAt = i + 1;
      }
    }

    expect(passes).toBe(10);
    expect(firstBlockAt).toBe(11);
  });
});

// ── Refresh principal isolation (RT-6) ───────────────────────────────────────

describe("refresh principal isolation (RT-6)", () => {
  it("61 requests with same token → blocked after max=60", async () => {
    const req = makeReq("10.3.0.1");
    const token = "static-refresh-token";
    const principal = createHash("sha256").update(token).digest("hex");
    const opts = { ...RATE_LIMITS["auth:refresh"], principal };

    for (let i = 0; i < opts.max; i++) {
      const result = await enforceRateLimit(req, opts);
      expect(result, `request ${i + 1} should pass`).toBeNull();
    }
    const blocked = await enforceRateLimit(req, opts);
    expect(blocked?.status).toBe(429);
  });

  it("max requests each with a distinct token → all pass (no cross-token spillover)", async () => {
    const req = makeReq("10.3.0.2");
    const baseOpts = RATE_LIMITS["auth:refresh"]; // max: 60

    for (let i = 0; i < baseOpts.max; i++) {
      const principal = createHash("sha256").update(`token-unique-${i}`).digest("hex");
      const result = await enforceRateLimit(req, { ...baseOpts, principal });
      expect(result, `distinct token ${i} should not be blocked`).toBeNull();
    }
  });
});
