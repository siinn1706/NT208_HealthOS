/**
 * BFF request-ID helper — generate or propagate X-Request-Id across BFF→Core.
 * Validates inbound IDs to prevent log-injection via header forgery.
 */

export const REQUEST_ID_HEADER = "X-Request-Id";

const RE = /^[A-Za-z0-9._-]{1,128}$/;

/** Return inbound id if valid; otherwise generate a fresh UUID hex. */
export function getOrCreateRequestId(req: { headers: Headers }): string {
  // Legacy X-Request-ID (full-caps) accepted for one release — remove 2026-09-01.
  const incoming = req.headers.get(REQUEST_ID_HEADER) ?? req.headers.get("X-Request-ID");
  if (incoming && RE.test(incoming)) return incoming;
  return crypto.randomUUID().replace(/-/g, "");
}
