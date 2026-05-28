// plan-catalog.ts — canonical plan codes and localized labels
// Implementation: task 2.1

/**
 * Canonical mapping of the four HealthOS subscription plan codes to their
 * localized display names. Used by filters, badges, and validators across
 * the Admin Console.
 *
 * Requirements: 13.1, 13.2, 13.3
 */
export const PLAN_CATALOG = {
  free:         { vi: "Miễn phí",     en: "Free"         },
  basic:        { vi: "Cơ bản",       en: "Basic"        },
  family:       { vi: "Gia đình",     en: "Family"       },
  professional: { vi: "Chuyên nghiệp", en: "Professional" },
} as const;

/** Union of the four valid plan code strings. */
export type PlanCode = keyof typeof PLAN_CATALOG;

/**
 * Case-sensitive type guard — returns `true` iff `s` is one of the four
 * canonical plan codes.
 *
 * Requirements: 13.1
 */
export function isKnownPlanCode(s: string): s is PlanCode {
  return Object.prototype.hasOwnProperty.call(PLAN_CATALOG, s);
}

/**
 * Returns the localized label for a known plan code, or falls through to
 * the raw code string for any unrecognized value.
 *
 * Requirements: 13.2, 13.3
 */
export function planLabel(code: string, locale: "vi" | "en"): string {
  if (isKnownPlanCode(code)) {
    return PLAN_CATALOG[code][locale];
  }
  return code;
}

/** Maps each plan code to its CSS token suffix (plan tier order: free → basic → family → professional). */
const PLAN_TOKEN_KEY: Record<PlanCode, string> = {
  free:         "free",
  basic:        "basic",
  family:       "pro",
  professional: "enterprise",
} as const;

/**
 * Returns a CSS `var()` reference for the plan tier color token, or `null`
 * for unrecognized codes.
 *
 * Usage: `style={{ color: getPlanTierColor(code) ?? undefined }}`
 */
export function getPlanTierColor(code: string): string | null {
  if (isKnownPlanCode(code)) {
    return `var(--admin-plan-${PLAN_TOKEN_KEY[code]})`;
  }
  return null;
}
