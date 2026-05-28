// formatting.ts — formatCount, formatVnd, formatIsoDate helpers

/** Non-numeric placeholder rendered when a value is unavailable (em dash). */
export const UNAVAILABLE = "—";

/**
 * Formats an integer count with locale-grouped thousands separators.
 * The value is clamped to [0, 9_999_999_999] before formatting.
 *
 * @param n      - The raw number to format.
 * @param locale - A BCP 47 locale string (e.g. "vi", "en-US").
 * @returns      The formatted string.
 */
export function formatCount(n: number, locale: string): string {
  const clamped = Math.max(0, Math.min(9_999_999_999, n));
  return new Intl.NumberFormat(locale).format(clamped);
}

/**
 * Formats a Vietnamese đồng amount.
 * Uses "." as the thousands separator and appends the "đ" suffix.
 * `formatVnd(0)` returns `"0đ"`.
 *
 * @param n - A non-negative integer price in VND.
 * @returns  The formatted string, e.g. `"99.000đ"` or `"1.000.000đ"`.
 */
export function formatVnd(n: number): string {
  // Intl.NumberFormat("vi-VN") uses "." as the thousands separator on all
  // conformant runtimes (Node ≥ 13, modern browsers). We strip any currency
  // symbol / code that the "currency" style would add and instead append "đ"
  // ourselves so the output is always exactly "<digits>đ".
  const formatted = new Intl.NumberFormat("vi-VN", {
    useGrouping: true,
    maximumFractionDigits: 0,
  }).format(n);

  // Verify the runtime actually uses "." as the thousands separator.
  // If it doesn't (non-conformant environment), fall back to manual formatting.
  const sample = new Intl.NumberFormat("vi-VN", {
    useGrouping: true,
    maximumFractionDigits: 0,
  }).format(1000);

  if (sample === "1.000") {
    // Runtime is conformant — use the Intl result directly.
    return `${formatted}đ`;
  }

  // Fallback: manual formatting with "." as thousands separator.
  const digits = Math.floor(Math.abs(n)).toString();
  const groups: string[] = [];
  let i = digits.length;
  while (i > 0) {
    groups.unshift(digits.slice(Math.max(0, i - 3), i));
    i -= 3;
  }
  return `${groups.join(".")}đ`;
}

/**
 * Validates and returns an ISO 8601 date string.
 * Returns `UNAVAILABLE` ("—") if the string cannot be parsed as a valid date.
 *
 * @param s - The candidate date string.
 * @returns  The original string if valid, or `"—"` if not.
 */
export function formatIsoDate(s: string): string {
  if (!s) return UNAVAILABLE;
  const d = new Date(s);
  if (isNaN(d.getTime())) return UNAVAILABLE;
  // Confirm the string round-trips through Date — rejects values like "abc"
  // that some engines may partially parse.
  try {
    d.toISOString();
    return s;
  } catch {
    return UNAVAILABLE;
  }
}
