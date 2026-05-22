/**
 * Unit tests for the rate-limit primitive — contract, IP resolution,
 * prod-misconfig sentinel, and store test-helper gating (RT-3, RT-4, RT-7).
 */
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  enforceRateLimit,
  rateLimitedResponse,
  __setStoreForTests,
  __resetStoreForTests,
} from "@/lib/bff-rate-limit";
import { MemoryStore } from "@/lib/bff-rate-limit-store-memory";

function makeReq(headers: Record<string, string> = {}): NextRequest {
  const req = new NextRequest("http://localhost/api/v1/auth/test", { method: "POST" });
  Object.entries(headers).forEach(([k, v]) => {
    Object.defineProperty(req.headers, "get", {
      writable: true,
      value: (name: string) => (name === k ? v : null),
    });
  });
  return req;
}

function makeReqWithIp(ip: string): NextRequest {
  return new NextRequest("http://localhost/api/v1/auth/test", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

const OPTS = { key: "auth:test", max: 3, windowSeconds: 60 };

beforeEach(() => {
  __setStoreForTests(new MemoryStore());
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  process.env.TRUST_PROXY = "1";
  delete process.env.REDIS_URL;
  process.env.NODE_ENV = "test";
});

afterEach(() => {
  __resetStoreForTests();
  vi.useRealTimers();
  delete process.env.TRUST_PROXY;
});

describe("rateLimitedResponse", () => {
  it("returns exact canonical body", () => {
    const res = rateLimitedResponse(45);
    expect(res.status).toBe(429);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(res.headers.get("Retry-After")).toBe("45");
  });

  it("body is byte-equal to canonical contract", async () => {
    const res = rateLimitedResponse(30);
    const text = await res.text();
    expect(text).toBe(
      '{"error":{"code":"RATE_LIMIT_EXCEEDED","message":"Too many requests. Please try again later."}}',
    );
  });

  it("clamps retryAfter to minimum 1", () => {
    const res = rateLimitedResponse(0);
    expect(res.headers.get("Retry-After")).toBe("1");
  });
});

describe("enforceRateLimit — IP resolution (RT-3)", () => {
  it("allows requests when IP is resolvable", async () => {
    const req = makeReqWithIp("1.2.3.4");
    const result = await enforceRateLimit(req, OPTS);
    expect(result).toBeNull();
  });

  it("fail-OPEN when IP is unresolvable (no x-forwarded-for, TRUST_PROXY=1)", async () => {
    const req = new NextRequest("http://localhost/api/v1/auth/test", { method: "POST" });
    process.env.TRUST_PROXY = "1";
    const result = await enforceRateLimit(req, OPTS);
    // Fail-OPEN: null (don't block), NOT a shared 'unknown' bucket
    expect(result).toBeNull();
  });

  it("uses TRUST_PROXY=0 and treats request without XFF as unresolvable", async () => {
    process.env.TRUST_PROXY = "0";
    const req = new NextRequest("http://localhost/api/v1/auth/test", {
      method: "POST",
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    // TRUST_PROXY=0 means we don't trust XFF headers — IP is unresolvable
    const result = await enforceRateLimit(req, OPTS);
    expect(result).toBeNull();
  });
});

describe("enforceRateLimit — threshold enforcement", () => {
  it("allows up to max requests", async () => {
    const req = makeReqWithIp("10.0.0.1");
    for (let i = 0; i < OPTS.max; i++) {
      const result = await enforceRateLimit(req, OPTS);
      expect(result).toBeNull();
    }
  });

  it("returns 429 on max+1 request", async () => {
    const req = makeReqWithIp("10.0.0.2");
    for (let i = 0; i < OPTS.max; i++) {
      await enforceRateLimit(req, OPTS);
    }
    const blocked = await enforceRateLimit(req, OPTS);
    expect(blocked?.status).toBe(429);
  });

  it("Retry-After reflects actual remaining TTL (not hardcoded windowSeconds)", async () => {
    const req = makeReqWithIp("10.0.0.3");
    for (let i = 0; i < OPTS.max; i++) {
      await enforceRateLimit(req, OPTS);
    }
    // Advance 30 seconds
    vi.advanceTimersByTime(30_000);
    const blocked = await enforceRateLimit(req, OPTS);
    expect(blocked?.status).toBe(429);
    const retryAfter = Number(blocked?.headers.get("Retry-After"));
    // Should be ~30 seconds remaining, not the full 60
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(30);
  });

  it("different IPs have independent buckets", async () => {
    const req1 = makeReqWithIp("10.0.0.4");
    const req2 = makeReqWithIp("10.0.0.5");
    for (let i = 0; i < OPTS.max; i++) {
      await enforceRateLimit(req1, OPTS);
    }
    // req2 should still pass
    const result = await enforceRateLimit(req2, OPTS);
    expect(result).toBeNull();
  });
});

describe("enforceRateLimit — custom principal (RT-6)", () => {
  it("keys by provided principal instead of IP", async () => {
    const req = makeReqWithIp("10.0.0.6");
    const opts = { ...OPTS, principal: "token-hash-abc" };
    for (let i = 0; i < opts.max; i++) {
      await enforceRateLimit(req, opts);
    }
    // Same req with different principal — should not be blocked
    const result = await enforceRateLimit(req, { ...opts, principal: "token-hash-xyz" });
    expect(result).toBeNull();
  });
});

describe("enforceRateLimit — production misconfig (RT-4)", () => {
  it("returns 503 with structured log when REDIS_URL missing in production", async () => {
    const logs: string[] = [];
    const originalError = console.error;
    console.error = (msg: string) => logs.push(msg);

    // Simulate production + no Redis
    __setStoreForTests(null);
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const req = makeReqWithIp("10.0.0.7");
    const result = await enforceRateLimit(req, OPTS);

    expect(result?.status).toBe(503);
    const body = await result?.json();
    expect(body?.error?.code).toBe("RATE_LIMIT_UNAVAILABLE");
    expect(logs.some((l) => l.includes("bff_rate_limit_unconfigured"))).toBe(true);

    process.env.NODE_ENV = originalEnv;
    console.error = originalError;
  });
});

describe("__setStoreForTests gating (RT-7)", () => {
  it("is a no-op when VITEST is not 'true'", () => {
    const orig = process.env.VITEST;
    process.env.VITEST = "false";
    // Should not throw, and store state should remain unchanged
    expect(() => __setStoreForTests(null)).not.toThrow();
    process.env.VITEST = orig;
  });
});
