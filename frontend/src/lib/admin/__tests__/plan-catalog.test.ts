// plan-catalog.test.ts — unit + property tests for plan-catalog.ts
// Tests implemented in task 2.2
//
// **Validates: Requirements 13.1, 13.2, 13.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { PLAN_CATALOG, isKnownPlanCode, planLabel } from "../plan-catalog";

// The four canonical plan codes
const VALID_CODES = ["free", "basic", "family", "professional"] as const;
const LOCALES = ["vi", "en"] as const;

/**
 * Property 32: Plan catalog completeness
 *
 * Part A (exhaustive example): planLabel(c, l) === PLAN_CATALOG[c][l]
 * for all four codes × {vi, en}.
 *
 * Part B (property): isKnownPlanCode(s) returns true iff
 * s ∈ {free, basic, family, professional} (case-sensitive).
 *
 * **Validates: Requirements 13.1, 13.2, 13.3**
 */
describe("Property 32: Plan catalog completeness", () => {
  // ── Part A: exhaustive example test ──────────────────────────────────────

  describe("planLabel matches PLAN_CATALOG for all codes × locales", () => {
    for (const code of VALID_CODES) {
      for (const locale of LOCALES) {
        it(`planLabel("${code}", "${locale}") === PLAN_CATALOG["${code}"]["${locale}"]`, () => {
          expect(planLabel(code, locale)).toBe(PLAN_CATALOG[code][locale]);
        });
      }
    }
  });

  // ── Part B: property test — isKnownPlanCode with arbitrary strings ────────

  it("isKnownPlanCode returns true iff s is exactly one of the four codes (fc.string)", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const expected = (VALID_CODES as readonly string[]).includes(s);
        return isKnownPlanCode(s) === expected;
      }),
    );
  });

  // ── Additional edge-case examples ─────────────────────────────────────────

  it("isKnownPlanCode is case-sensitive — uppercase variants are rejected", () => {
    expect(isKnownPlanCode("Free")).toBe(false);
    expect(isKnownPlanCode("BASIC")).toBe(false);
    expect(isKnownPlanCode("Family")).toBe(false);
    expect(isKnownPlanCode("Professional")).toBe(false);
  });

  it("isKnownPlanCode rejects empty string", () => {
    expect(isKnownPlanCode("")).toBe(false);
  });

  it("planLabel falls through to the raw code for unknown values", () => {
    expect(planLabel("unknown", "en")).toBe("unknown");
    expect(planLabel("", "vi")).toBe("");
    expect(planLabel("FREE", "en")).toBe("FREE");
  });
});
