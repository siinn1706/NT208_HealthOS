/**
 * subscription-quick-action-payloads.test.ts
 *
 * Verifies payload builder decisions D2 and D3 from the plan:
 *  D2: Cancel preserves expires_at, only flips status to "canceled"
 *  D3: Extend on null/canceled sub uses base = now, forces status = "active"
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildCancelPayload,
  buildExtendPayload,
  buildResetToFreePayload,
} from "../subscription-quick-action-payloads";
import type { UserSubscription } from "@/components/admin/user-detail/ProfileSection";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ACTIVE_SUB: UserSubscription = {
  plan_code: "basic",
  status: "active",
  expires_at: "2025-12-31T00:00:00.000Z",
};

const CANCELED_SUB: UserSubscription = {
  plan_code: "professional",
  status: "canceled",
  expires_at: "2025-06-01T00:00:00.000Z",
};

const SUB_NO_EXPIRY: UserSubscription = {
  plan_code: "family",
  status: "active",
  expires_at: undefined,
};

// ── buildCancelPayload (Validation D2) ────────────────────────────────────────

describe("buildCancelPayload — D2: cancel preserves expires_at", () => {
  it("sets status to 'canceled'", () => {
    const result = buildCancelPayload(ACTIVE_SUB);
    expect(result.status).toBe("canceled");
  });

  it("preserves the original plan_code", () => {
    const result = buildCancelPayload(ACTIVE_SUB);
    expect(result.plan_code).toBe("basic");
  });

  it("preserves expires_at when present (service runs to end of paid period)", () => {
    const result = buildCancelPayload(ACTIVE_SUB);
    expect(result.expires_at).toBe("2025-12-31T00:00:00.000Z");
  });

  it("sets expires_at to null when subscription has no expiry", () => {
    const result = buildCancelPayload(SUB_NO_EXPIRY);
    expect(result.expires_at).toBeNull();
  });

  it("preserves expires_at from a canceled subscription (idempotent re-cancel)", () => {
    const result = buildCancelPayload(CANCELED_SUB);
    expect(result.expires_at).toBe("2025-06-01T00:00:00.000Z");
    expect(result.status).toBe("canceled");
  });
});

// ── buildExtendPayload (Validation D3) ───────────────────────────────────────

describe("buildExtendPayload — D3: extend base logic", () => {
  const FIXED_NOW = new Date("2025-08-01T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("forces status to 'active'", () => {
    const result = buildExtendPayload(ACTIVE_SUB, 30);
    expect(result.status).toBe("active");
  });

  it("extends from current expires_at when sub is active with expiry", () => {
    const result = buildExtendPayload(ACTIVE_SUB, 30);
    const base = new Date("2025-12-31T00:00:00.000Z");
    const expected = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(result.expires_at).toBe(expected);
  });

  it("uses base = now when subscription is null", () => {
    const result = buildExtendPayload(null, 30);
    const expected = new Date(FIXED_NOW.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(result.expires_at).toBe(expected);
    expect(result.plan_code).toBe("free");
  });

  it("uses base = now when subscription is canceled (D3)", () => {
    const result = buildExtendPayload(CANCELED_SUB, 30);
    const expected = new Date(FIXED_NOW.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(result.expires_at).toBe(expected);
  });

  it("uses base = now when active sub has no expires_at", () => {
    const result = buildExtendPayload(SUB_NO_EXPIRY, 90);
    const expected = new Date(FIXED_NOW.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
    expect(result.expires_at).toBe(expected);
  });

  it("preserves plan_code from current sub", () => {
    expect(buildExtendPayload(ACTIVE_SUB, 30).plan_code).toBe("basic");
    expect(buildExtendPayload(CANCELED_SUB, 30).plan_code).toBe("professional");
  });

  it("computes correct +30d and +90d from current expiry", () => {
    const r30 = buildExtendPayload(ACTIVE_SUB, 30);
    const r90 = buildExtendPayload(ACTIVE_SUB, 90);
    const base = new Date("2025-12-31T00:00:00.000Z").getTime();
    expect(new Date(r30.expires_at!).getTime()).toBe(base + 30 * 86400000);
    expect(new Date(r90.expires_at!).getTime()).toBe(base + 90 * 86400000);
  });
});

// ── buildResetToFreePayload ───────────────────────────────────────────────────

describe("buildResetToFreePayload", () => {
  it("sets plan_code to 'free'", () => {
    expect(buildResetToFreePayload().plan_code).toBe("free");
  });

  it("sets status to 'active'", () => {
    expect(buildResetToFreePayload().status).toBe("active");
  });

  it("sets expires_at to null", () => {
    expect(buildResetToFreePayload().expires_at).toBeNull();
  });
});
