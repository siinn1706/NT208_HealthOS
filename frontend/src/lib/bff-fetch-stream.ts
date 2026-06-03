/**
 * bff-fetch-stream — streaming wrapper that reuses the BFF authentication
 * conventions (401-redirect, credentials, base headers) without buffering
 * the response body.
 *
 * Design notes:
 *   - Only the headers-received phase is subject to a timeout. The body
 *     stream is left open until the caller's reader finishes; AI completions
 *     can take minutes and must not be killed by a blanket timeout.
 *   - 401 responses trigger the same client-side redirect as bffFetch so
 *     session expiry is handled uniformly.
 *   - The caller is responsible for reading `resp.body` and must handle
 *     AbortErrors from the outer `streamAbortRef` (stop-generation button).
 */

import { BffError } from "./api-client";

const DEFAULT_HEADERS: HeadersInit = {
  "Content-Type": "application/json",
};

/** Default timeout for the headers-only phase (ms). Body stream is unbounded. */
const HEADERS_TIMEOUT_MS = 30_000;

/**
 * Initiates a streaming BFF request. Returns the raw `Response` with the
 * body stream intact so the caller can incrementally consume chunks.
 *
 * @param input   BFF path, e.g. `/api/v1/conversations/{id}/messages/stream`
 * @param init    Fetch init — do NOT pass a timeout signal here; provide
 *                `headersTimeoutMs` instead so the body stream remains open.
 * @param headersTimeoutMs  Abort if headers are not received within this window.
 *                          Defaults to 30 s. Pass 0 to disable.
 */
export async function bffFetchStream(
  input: string,
  init: RequestInit = {},
  headersTimeoutMs = HEADERS_TIMEOUT_MS,
): Promise<Response> {
  // Use the caller's signal if supplied; otherwise build our own for the
  // headers-phase timeout. The two are OR-ed via AbortSignal.any where available.
  const headersController = headersTimeoutMs > 0 ? new AbortController() : null;
  const timeoutId = headersController
    ? setTimeout(() => headersController.abort(new DOMException("Headers timeout", "TimeoutError")), headersTimeoutMs)
    : null;

  // Combine the caller's abort signal (e.g. stop-generation) with the headers
  // timeout signal so either can cancel the request.
  let combinedSignal: AbortSignal | undefined;
  if (headersController && init.signal) {
    // AbortSignal.any is available in modern browsers (2023+). Fall back to
    // a manual approach for environments that don't support it yet.
    if (typeof (AbortSignal as { any?: unknown }).any === "function") {
      type AbortSignalWithAny = { any: (signals: AbortSignal[]) => AbortSignal };
      combinedSignal = (AbortSignal as unknown as AbortSignalWithAny).any(
        [init.signal as AbortSignal, headersController.signal],
      );
    } else {
      // Fallback: propagate caller abort to the headers controller.
      (init.signal as AbortSignal).addEventListener(
        "abort",
        () => headersController.abort((init.signal as AbortSignal).reason),
        { once: true },
      );
      combinedSignal = headersController.signal;
    }
  } else if (headersController) {
    combinedSignal = headersController.signal;
  } else {
    combinedSignal = init.signal as AbortSignal | undefined;
  }

  try {
    const res = await fetch(input, {
      ...init,
      headers: { ...DEFAULT_HEADERS, ...(init.headers ?? {}) },
      signal: combinedSignal,
    });

    // Headers received — cancel the headers-phase timeout so the body
    // stream can run for as long as it needs.
    if (timeoutId !== null) clearTimeout(timeoutId);

    if (res.status === 401 && typeof window !== "undefined") {
      const from = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?from=${from}`;
      // Return a never-resolving promise so the caller's await hangs
      // while the browser navigates away (same pattern as bffFetch).
      return new Promise<Response>(() => {});
    }

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({
        error: { code: "UNKNOWN", message: res.statusText },
      })) as { error?: { code?: string; message?: string } };
      throw new BffError(
        res.status,
        errorBody?.error?.code ?? "UNKNOWN",
        errorBody?.error?.message ?? res.statusText,
      );
    }

    return res;
  } catch (err) {
    if (timeoutId !== null) clearTimeout(timeoutId);
    throw err;
  }
}
