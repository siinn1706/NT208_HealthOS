/**
 * bff-admin-client.ts — Browser fetch helper for /api/v1/admin/* endpoints.
 *
 * All admin pages call `adminFetch` instead of raw `fetch`. It handles:
 *  - 15 s default timeout via AbortController
 *  - 401 → clear caches + redirect to /{locale}/login?from=<pathname>
 *  - 403 → redirect to /{locale}/admin/forbidden
 *  - non-ok (5xx, etc.) → throw AdminFetchError
 *  - success → return res.json() as T
 *
 * This is browser-only code (client components). Do not import in server
 * components or API route handlers.
 *
 * Requirements: 3.11, 10.2, 10.3, 10.4
 */

// ── In-memory cache map ────────────────────────────────────────────────────

/** Shared in-memory cache used by admin pages. Cleared on auth failure. */
const _adminCache = new Map<string, unknown>();

/**
 * Clears all entries in the in-memory admin cache map.
 * Called automatically on 401 responses and can be called manually on
 * sign-out or session invalidation.
 */
export function clearAdminCaches(): void {
  _adminCache.clear();
}

// ── Error classes ──────────────────────────────────────────────────────────

/** Thrown when the BFF returns HTTP 401 (session expired / not authenticated). */
export class AdminAuthError extends Error {
  constructor() {
    super("Admin session expired or not authenticated (401)");
    this.name = "AdminAuthError";
  }
}

/** Thrown when the BFF returns HTTP 403 (authenticated but not an admin). */
export class AdminForbiddenError extends Error {
  constructor() {
    super("Access forbidden — admin role required (403)");
    this.name = "AdminForbiddenError";
  }
}

/** Thrown when the BFF returns a non-ok response other than 401/403. */
export class AdminFetchError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`Admin BFF request failed with status ${status}`);
    this.name = "AdminFetchError";
    this.status = status;
    this.body = body;
  }
}

// ── Internal navigation helpers ────────────────────────────────────────────

/**
 * Extracts the locale prefix from a pathname.
 * e.g. "/vi/admin/users" → "vi", "/en/admin" → "en", "/admin" → "vi" (default)
 */
function _getLocaleFromPathname(pathname: string): string {
  const match = /^\/([a-z]{2,10})(?:\/|$)/.exec(pathname);
  return match?.[1] ?? "vi";
}

/**
 * Clears admin caches and redirects to /{locale}/login?from=<encoded pathname>.
 * Called on 401 responses (R10.2).
 */
function handleAuthRedirect(): void {
  clearAdminCaches();
  const pathname = window.location.pathname;
  const locale = _getLocaleFromPathname(pathname);
  const from = encodeURIComponent(pathname);
  window.location.href = `/${locale}/login?from=${from}`;
}

/**
 * Redirects to /{locale}/admin/forbidden.
 * Called on 403 responses (R10.3).
 */
function handleForbiddenRedirect(): void {
  const pathname = window.location.pathname;
  const locale = _getLocaleFromPathname(pathname);
  window.location.href = `/${locale}/admin/forbidden`;
}

// ── Main fetch helper ──────────────────────────────────────────────────────

/** Default timeout for admin BFF requests (15 seconds). */
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Typed fetch helper for admin BFF endpoints.
 *
 * @param path    Must start with `/api/v1/admin/`.
 * @param init    Standard RequestInit plus optional `timeoutMs` override.
 * @returns       Parsed JSON response body cast to `T`.
 *
 * @throws {AdminAuthError}      On HTTP 401 (also triggers login redirect).
 * @throws {AdminForbiddenError} On HTTP 403 (also triggers forbidden redirect).
 * @throws {AdminFetchError}     On any other non-ok response.
 * @throws {DOMException}        On timeout (AbortError) or network failure.
 */
export async function adminFetch<T>(
  path: `/api/v1/admin/${string}`,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs, ...fetchInit } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(path, {
      ...fetchInit,
      credentials: "same-origin",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        ...(fetchInit.headers ?? {}),
      },
    });

    if (res.status === 401) {
      handleAuthRedirect();
      throw new AdminAuthError();
    }

    if (res.status === 403) {
      handleForbiddenRedirect();
      throw new AdminForbiddenError();
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new AdminFetchError(res.status, body);
    }

    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}
