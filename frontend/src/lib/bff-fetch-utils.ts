/**
 * BFF auth-route utilities for timeout and body-size protection.
 *
 * Auth routes that call Core BE directly (bypassing coreProxy) must use
 * these helpers to prevent hung-backend DoS and oversized-body memory exhaustion.
 */

const BFF_TIMEOUT_MS = 30_000;
const BFF_MAX_BODY_BYTES = 1_048_576; // 1 MiB

/**
 * Read a request body as text, enforce a 1 MiB size limit, and parse as JSON.
 * Throws if the body exceeds the limit or is not valid JSON.
 */
export async function parseJsonBody(req: Request): Promise<unknown> {
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > BFF_MAX_BODY_BYTES) {
    throw Object.assign(new Error("Request body too large"), { status: 413 });
  }
  return JSON.parse(raw);
}

/**
 * fetch() wrapper that aborts after BFF_TIMEOUT_MS milliseconds.
 * Prevents BFF worker threads from blocking indefinitely on a slow Core BE.
 */
export function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BFF_TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId)
  );
}
