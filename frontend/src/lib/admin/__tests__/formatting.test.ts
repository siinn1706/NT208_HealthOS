// formatting.test.ts — unit + property tests for formatting.ts
// Tests implemented in tasks 5.2–5.3
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { formatCount, formatVnd, UNAVAILABLE } from "../formatting";

/**
 * Property 19: Numeric overview formatting
 * Validates: Requirements 6.1, 6.6
 *
 * For any integer n and each of the tested locales:
 * - formatCount(n, locale) === Intl.NumberFormat(locale).format(clamp(0, 9_999_999_999, n))
 * Also asserts that UNAVAILABLE === "—" (em dash).
 */
describe("formatCount — Property 19: Numeric overview formatting", () => {
  const LOCALES = ["vi", "en", "en-US"] as const;

  it('UNAVAILABLE constant equals "—" (em dash)', () => {
    expect(UNAVAILABLE).toBe("—");
  });

  for (const locale of LOCALES) {
    it(`formatCount matches Intl.NumberFormat clamped output for locale "${locale}"`, () => {
      fc.assert(
        fc.property(
          fc.integer(),
          (n) => {
            const clamped = Math.max(0, Math.min(9_999_999_999, n));
            const expected = new Intl.NumberFormat(locale).format(clamped);
            expect(formatCount(n, locale)).toBe(expected);
          },
        ),
      );
    });
  }
});

/**
 * Property 27: VND price formatter
 * Validates: Requirements 9.2
 */
describe("formatVnd", () => {
  // Example tests
  it('formatVnd(0) === "0đ"', () => {
    expect(formatVnd(0)).toBe("0đ");
  });

  it('formatVnd(99000) === "99.000đ"', () => {
    expect(formatVnd(99000)).toBe("99.000đ");
  });

  it('formatVnd(1000000) === "1.000.000đ"', () => {
    expect(formatVnd(1000000)).toBe("1.000.000đ");
  });

  /**
   * **Validates: Requirements 9.2**
   *
   * For any integer n in [0, 1_000_000_000_000]:
   * - output ends with "đ"
   * - the numeric part matches Intl.NumberFormat("vi-VN") with "." thousands separator
   */
  it("Property 27: VND price formatter — output ends with đ and uses . as thousands separator", () => {
    const formatter = new Intl.NumberFormat("vi-VN", {
      useGrouping: true,
      maximumFractionDigits: 0,
    });

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000_000_000 }),
        (n) => {
          const result = formatVnd(n);

          // Output must end with "đ"
          expect(result.endsWith("đ")).toBe(true);

          // The numeric part (without "đ") must match the vi-VN formatted number
          const numericPart = result.slice(0, -1); // remove trailing "đ"
          const expected = formatter.format(n);
          expect(numericPart).toBe(expected);
        },
      ),
    );
  });
});
