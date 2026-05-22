/**
 * BFF request-ID helper — generate or propagate X-Request-ID across BFF→Core.
 * Validates inbound IDs to prevent log-injection via header forgery.
 */

export const REQUEST_ID_HEADER = "X-Request-ID";

const RE = /^[A-Za-z0-9._-]{1,128}$/;

/** Return inbound id if valid; otherwise generate a fresh UUID hex. */
export function getOrCreateRequestId(req: { headers: Headers }): string {
  const incoming = req.headers.get(REQUEST_ID_HEADER);
  if (incoming && RE.test(incoming)) return incoming;
  return crypto.randomUUID().replace(/-/g, "");
}
