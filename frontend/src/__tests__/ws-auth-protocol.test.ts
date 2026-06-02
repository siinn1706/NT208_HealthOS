/**
 * Tests for frontend/src/lib/ws-auth-protocol.ts
 *
 * Covers:
 *   - buildAuthFrame produces the correct JSON structure
 *   - isAuthRejected returns true only for code 4401
 */
import { describe, it, expect } from "vitest";
import { buildAuthFrame, isAuthRejected } from "@/lib/ws-auth-protocol";

describe("buildAuthFrame", () => {
  it("produces a JSON string with type='auth' and the given ticket", () => {
    const result = buildAuthFrame("test-ticket-abc");
    const parsed = JSON.parse(result) as unknown;
    expect(parsed).toEqual({ type: "auth", ticket: "test-ticket-abc" });
  });

  it("handles tickets with special characters", () => {
    const ticket = "tok/en+with=special&chars";
    const result = buildAuthFrame(ticket);
    const parsed = JSON.parse(result) as { type: string; ticket: string };
    expect(parsed.ticket).toBe(ticket);
  });

  it("returns a string (not an object)", () => {
    expect(typeof buildAuthFrame("abc")).toBe("string");
  });
});

describe("isAuthRejected", () => {
  it("returns true for close code 4401", () => {
    expect(isAuthRejected(4401)).toBe(true);
  });

  it("returns false for normal close code 1000", () => {
    expect(isAuthRejected(1000)).toBe(false);
  });

  it("returns false for 4001 (legacy session-expired code)", () => {
    // 4001 is handled separately by the caller; isAuthRejected only covers 4401.
    expect(isAuthRejected(4001)).toBe(false);
  });

  it("returns false for 4000", () => {
    expect(isAuthRejected(4000)).toBe(false);
  });

  it("returns false for 4402", () => {
    expect(isAuthRejected(4402)).toBe(false);
  });

  it("returns false for 0 (abnormal close)", () => {
    expect(isAuthRejected(0)).toBe(false);
  });
});
