/**
 * Validates `from` query param after login to prevent open redirects.
 * Only same-origin relative paths under /dashboard (with optional locale prefix) are allowed.
 */
const APP_LOCALES = ["vi", "en"] as const;

function stripLocalePrefix(pathname: string): string {
  for (const loc of APP_LOCALES) {
    if (pathname === `/${loc}`) return "/";
    if (pathname.startsWith(`/${loc}/`)) {
      return pathname.slice(`/${loc}`.length);
    }
  }
  return pathname;
}

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

/** Returns the original pathname if safe, otherwise null. */
export function getSafePostLoginRedirectPath(raw: string | null): string | null {
  if (raw == null || raw === "") return null;
  if (raw.includes("\u0000") || raw.includes("\\")) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.includes("://")) return null;

  const normalized = stripLocalePrefix(raw);
  if (!normalized.startsWith("/")) return null;
  if (!isSafeDashboardPath(normalized)) return null;

  return raw;
}
