/**
 * ws-auth-protocol — helpers for post-connect WebSocket authentication.
 *
 * Security: the auth ticket is sent as the FIRST frame after connection opens
 * instead of being embedded in the URL. URL-embedded tokens leak into proxy
 * logs, CDN access logs, and browser history; a post-connect frame stays
 * within the encrypted TLS tunnel and is never logged by intermediaries.
 *
 * Protocol contract (agreed with Core BE):
 *   1. Client connects — NO token in the URL query string.
 *   2. Client immediately sends: { "type": "auth", "ticket": "<ws_ticket>" }
 *   3. Server validates the ticket.
 *      - Valid   → normal operation begins.
 *      - Invalid → server closes with code 4401.
 *   4. Client treats close code 4401 as "auth rejected / session expired".
 */

/** Builds the post-connect authentication frame payload (JSON string). */
export function buildAuthFrame(ticket: string): string {
  return JSON.stringify({ type: "auth", ticket });
}

/**
 * Returns true when the WebSocket close code indicates the server rejected
 * the auth ticket (i.e. the session has expired or the ticket is invalid).
 * The caller should surface a "session expired" message and stop reconnecting.
 */
export function isAuthRejected(code: number): boolean {
  return code === 4401;
}
