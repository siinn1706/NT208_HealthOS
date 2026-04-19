/**
 * Validates `from` query param after login to prevent open redirects.
 * Only same-origin relative paths under /dashboard (with optional locale prefix) are allowed.
 *
 * Returns the **locale-stripped** path so callers can hand it to next-intl's
 * `router.push(...)` (which auto-prefixes the active locale). Returning the raw
 * `/vi/dashboard/...` would double-prefix into `/vi/vi/dashboard/...` → 404.
 * See plans/post-login-double-locale-redirect/plan.md.
 */
import { stripLocalePrefix } from "./locale-path";

function isSafeDashboardPath(pathWithoutLocaleLeadingSlash: string): boolean {
  if (
    pathWithoutLocaleLeadingSlash !== "/dashboard" &&
    !pathWithoutLocaleLeadingSlash.startsWith("/dashboard/")
  ) {
    return false;
  }
  const segments = pathWithoutLocaleLeadingSlash.split("/").filter(Boolean);
  if (segments.some((s) => s === ".." || s.includes("\u0000"))) {
    return false;
  }
  if (pathWithoutLocaleLeadingSlash.includes("\\")) {
    return false;
  }
  return true;
}

/** Returns the locale-stripped pathname if safe, otherwise null. */
export function getSafePostLoginRedirectPath(raw: string | null): string | null {
  if (raw == null || raw === "") return null;
  if (raw.includes("\u0000") || raw.includes("\\")) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.includes("://")) return null;

  const normalized = stripLocalePrefix(raw);
  if (!normalized.startsWith("/")) return null;
  if (!isSafeDashboardPath(normalized)) return null;

  return normalized;
}
