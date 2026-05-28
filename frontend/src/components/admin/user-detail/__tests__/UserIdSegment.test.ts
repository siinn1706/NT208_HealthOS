/**
 * UserIdSegment.test.ts
 *
 * Property tests for the [id] segment validity rule used by the
 * /[locale]/admin/users/[id] route.
 *
 * Task 19.3 — Property 1: User-id segment validity
 * Validates: Requirements 1.3
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// The validator is defined inline here as specified by the task.
// It mirrors the guard in frontend/src/app/api/v1/admin/users/[id]/route.ts
// and the page-level check in admin/users/[id]/page.tsx.
// ---------------------------------------------------------------------------

/**
 * Returns true iff the given string is a valid [id] segment for the
 * /admin/users/[id] route — i.e. its length is in the closed range [1, 64].
 *
 * **Validates: Requirements 1.3**
 */
const isValidUserIdSegment = (s: string): boolean =>
  s.length >= 1 && s.length <= 64;

// ---------------------------------------------------------------------------
// Property 1: User-id segment validity
// ---------------------------------------------------------------------------

describe("Property 1: User-id segment validity", () => {
  /**
   * Validates: Requirements 1.3
   *
   * For any string s:
   *   isValidUserIdSegment(s) === true  iff  s.length ∈ [1, 64]
   */

  // ── Sub-property 1a: arbitrary strings ────────────────────────────────────

  it("returns true iff length is in [1, 64] for arbitrary strings", () => {
    // **Validates: Requirements 1.3**
    fc.assert(
      fc.property(fc.string(), (s) => {
        const result = isValidUserIdSegment(s);
        const expected = s.length >= 1 && s.length <= 64;
        expect(result).toBe(expected);
      }),
      { numRuns: 1000 }
    );
  });

  // ── Sub-property 1b: valid strings (length 1–64) always return true ───────

  it("always returns true for strings with length in [1, 64]", () => {
    // **Validates: Requirements 1.3**
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 64 }), (s) => {
        expect(isValidUserIdSegment(s)).toBe(true);
      }),
      { numRuns: 500 }
    );
  });

  // ── Sub-property 1c: invalid strings (length > 64) always return false ────

  it("always returns false for strings with length > 64", () => {
    // **Validates: Requirements 1.3**
    fc.assert(
      fc.property(fc.string({ minLength: 65, maxLength: 200 }), (s) => {
        expect(isValidUserIdSegment(s)).toBe(false);
      }),
      { numRuns: 500 }
    );
  });

  // ── Sub-property 1d: empty string always returns false ────────────────────

  it("returns false for the empty string", () => {
    // **Validates: Requirements 1.3**
    expect(isValidUserIdSegment("")).toBe(false);
  });

  // ── Boundary examples ─────────────────────────────────────────────────────

  it("returns true for a single-character string (lower boundary)", () => {
    expect(isValidUserIdSegment("a")).toBe(true);
  });

  it("returns true for a 64-character string (upper boundary)", () => {
    expect(isValidUserIdSegment("a".repeat(64))).toBe(true);
  });

  it("returns false for a 65-character string (one over upper boundary)", () => {
    expect(isValidUserIdSegment("a".repeat(65))).toBe(false);
  });
});
