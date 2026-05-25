/**
 * proxy-admin-fixture.test.ts
 *
 * Property-based tests for admin proxy fixture helpers.
 *
 * **Validates: Requirements 1.8**
 */

import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import { isKnownLocale } from "@/lib/admin/path-classify";
import { routing } from "@/i18n/routing";

// ── Property 3: Locale gating ─────────────────────────────────────────────────
//
// For all strings `s`, `isKnownLocale(s, routing.locales)` SHALL return true
// iff `s ∈ routing.locales`.
//
// **Validates: Requirements 1.8**

describe("Property 3: Locale gating", () => {
  it("isKnownLocale returns true iff s is in routing.locales (arbitrary strings)", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const result = isKnownLocale(s, routing.locales);
        const expected = (routing.locales as readonly string[]).includes(s);
        return result === expected;
      }),
    );
  });

  it("isKnownLocale returns true for every known locale", () => {
    for (const locale of routing.locales) {
      expect(isKnownLocale(locale, routing.locales)).toBe(true);
    }
  });

  it("isKnownLocale returns false for strings that are not locales", () => {
    // Strings that are clearly not in ["vi", "en"]
    const nonLocales = ["", "fr", "de", "zh", "VI", "EN", "Vi", "En", " vi", "vi ", "vi\n"];
    for (const s of nonLocales) {
      if (!(routing.locales as readonly string[]).includes(s)) {
        expect(isKnownLocale(s, routing.locales)).toBe(false);
      }
    }
  });
});
