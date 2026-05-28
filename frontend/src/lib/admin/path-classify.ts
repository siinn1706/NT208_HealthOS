/**
 * path-classify.ts
 *
 * Pure path-classification helpers used by the Proxy_Guard (proxy.ts) and
 * any server/client code that needs to reason about admin or dashboard paths.
 *
 * All functions are side-effect-free and have no external dependencies so
 * they can be imported in both Edge (middleware) and Node runtimes.
 *
 * Requirements: 5.1, 5.3, 5.5, 1.8
 */

const ADMIN_PREFIX = "/admin";
const DASHBOARD_PREFIX = "/dashboard";

/**
 * Strip query string (`?...`) and fragment (`#...`) from a pathname, then
 * strip a trailing slash.  The result is always a clean pathname string.
 *
 * e.g. "/admin/?foo=1#bar" → "/admin"
 *      "/admin/"           → "/admin"
 *      "/admin"            → "/admin"
 */
function normalise(pathname: string): string {
  // Strip fragment first (fragment may contain '?')
  const noFragment = pathname.split("#")[0];
  // Strip query string
  const noQuery = noFragment.split("?")[0];
  // Strip trailing slash (but keep the root "/" intact)
  return noQuery.length > 1 ? noQuery.replace(/\/+$/, "") : noQuery;
}

/**
 * Returns `true` if `pathnameWithoutLocale` refers to the admin section.
 *
 * Matches exactly "/admin" or any path that starts with "/admin/".
 * Trailing slashes, query strings, and fragments are ignored before
 * classification (Requirement 5.1).
 *
 * @param pathnameWithoutLocale - pathname with the locale segment already
 *   stripped by the caller (e.g. "/admin/users", not "/vi/admin/users").
 */
export function isAdminPath(pathnameWithoutLocale: string): boolean {
  const p = normalise(pathnameWithoutLocale);
  return p === ADMIN_PREFIX || p.startsWith(ADMIN_PREFIX + "/");
}

/**
 * Returns `true` if `pathnameWithoutLocale` refers to the dashboard section.
 *
 * Matches exactly "/dashboard" or any path that starts with "/dashboard/".
 * Trailing slashes, query strings, and fragments are ignored before
 * classification (Requirement 5.5).
 *
 * @param pathnameWithoutLocale - pathname with the locale segment already
 *   stripped by the caller.
 */
export function isDashboardPath(pathnameWithoutLocale: string): boolean {
  const p = normalise(pathnameWithoutLocale);
  return p === DASHBOARD_PREFIX || p.startsWith(DASHBOARD_PREFIX + "/");
}

/**
 * Strips the leading locale segment from a pathname.
 *
 * e.g. stripLocale("/vi/admin", ["vi", "en"]) → "/admin"
 *      stripLocale("/en/dashboard/", ["vi", "en"]) → "/dashboard/"
 *      stripLocale("/admin", ["vi", "en"]) → "/admin"  (no locale prefix)
 *
 * If no locale prefix is found the pathname is returned unchanged.
 *
 * @param pathname - the raw pathname including the locale segment.
 * @param locales  - the list of known locale codes (e.g. ["vi", "en"]).
 */
export function stripLocale(
  pathname: string,
  locales: readonly string[]
): string {
  if (locales.length === 0) return pathname;

  // Build a regex that matches "/<locale>" at the start of the pathname.
  // Escape each locale code to be safe, then join with "|".
  const escaped = locales.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`^/(${escaped.join("|")})((?=/)|$)`);
  const match = re.exec(pathname);
  if (!match) return pathname;

  // Remove the "/<locale>" prefix; preserve the rest (including leading "/").
  const rest = pathname.slice(match[1].length + 1); // +1 for the leading "/"
  return rest.startsWith("/") ? rest : "/" + rest;
}

/**
 * Returns `true` iff `s` is present in the `locales` array.
 *
 * @param s       - the string to test (e.g. a URL segment).
 * @param locales - the list of known locale codes.
 */
export function isKnownLocale(s: string, locales: readonly string[]): boolean {
  return locales.includes(s);
}

/**
 * Builds the login redirect URL for an unauthenticated request.
 *
 * Returns `/${locale}/login?from=${encodeURIComponent(originalPathname)}`
 *
 * The `originalPathname` MUST be the pathname WITHOUT query string or
 * fragment (Requirement 5.3).
 *
 * @param locale           - the locale code for the login page (e.g. "vi").
 * @param originalPathname - the pathname the user was trying to reach,
 *   already stripped of query/fragment.
 */
export function buildLoginRedirect(
  locale: string,
  originalPathname: string
): string {
  return `/${locale}/login?from=${encodeURIComponent(originalPathname)}`;
}
