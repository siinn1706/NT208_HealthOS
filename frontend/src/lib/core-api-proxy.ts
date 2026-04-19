/**
 * Core BE proxy utility for BFF route handlers.
 *
 * Usage:
 *   import { coreProxy } from "@/lib/core-api-proxy";
 *   return coreProxy(request, "/v1/conversations");
 *
 * Rules (docs/standards/code-style.md):
 *   - BFF has NO business logic — only proxy + session check
 *   - Never expose Core BE directly to the browser
 *   - Always forward Authorization header when session token is available
 */

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";
import { CORE_API_URL } from "@/lib/env";

/** Read the Core BE JWT from the session cookie (set by /api/v1/auth on login). */
async function getSessionToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

type ProxyOptions = {
  /** Override the upstream path. Defaults to the inferred path from the request URL. */
  upstreamPath?: string;
  /** Override the request method. */
  method?: string;
  /** Body to forward (already parsed). Pass null to strip body. */
  body?: unknown;
  /** Extra headers to merge in. */
  extraHeaders?: Record<string, string>;
  /** If true, return an error response instead of falling back to mock on BE offline. */
  strictMode?: boolean;
  /** If true (default), require an authenticated session token before forwarding. */
  requireAuth?: boolean;
  /**
   * Override the body-size cap (bytes). Defaults to 1 MiB for JSON proxies.
   * Multipart proxies should opt into a larger cap (Core accepts 10 MiB for
   * meal images — see UX plan §I).
   */
  bodySizeLimit?: number;
  /**
   * When true, forward the raw request body as multipart/form-data without
   * parsing it as JSON. Use this for file uploads (e.g. /v1/meals/analyze-photo).
   * The browser-supplied Content-Type (with boundary) is preserved.
   */
  multipart?: boolean;
};

const JSON_BODY_LIMIT = 1_048_576;            // 1 MiB
const MULTIPART_BODY_LIMIT = 10 * 1_048_576;  // 10 MiB — matches Core's upload cap

/**
 * Map an HTTP status code to a sane default error code when upstream did not
 * provide one. Keeps the BFF→FE contract consistent regardless of how the
 * Core service shaped its response (FastAPI `{detail}`, plain string, empty body).
 */
function defaultCodeForStatus(status: number): string {
  switch (status) {
    case 400: return "BAD_REQUEST";
    case 401: return "UNAUTHORIZED";
    case 403: return "FORBIDDEN";
    case 404: return "NOT_FOUND";
    case 409: return "CONFLICT";
    case 413: return "PAYLOAD_TOO_LARGE";
    case 415: return "UNSUPPORTED_MEDIA_TYPE";
    case 422: return "VALIDATION_FAILED";
    case 429: return "RATE_LIMIT_EXCEEDED";
    default:
      if (status >= 400 && status < 500) return "CLIENT_ERROR";
      return "UPSTREAM_ERROR";
  }
}

function defaultMessageForStatus(status: number): string {
  switch (status) {
    case 400: return "The request was invalid.";
    case 401: return "Authentication required.";
    case 403: return "You don't have permission to perform this action.";
    case 404: return "The requested resource was not found.";
    case 409: return "The request conflicts with the current state.";
    case 413: return "Request body is too large.";
    case 415: return "Unsupported media type.";
    case 422: return "The submitted data failed validation.";
    case 429: return "Too many requests. Please try again later.";
    default:
      return status >= 400 && status < 500
        ? "The request could not be completed."
        : "Upstream service error.";
  }
}

/**
 * Coerce any upstream payload (or `null` body) into the canonical error shape:
 *   { error: { code, message, details?, field_errors? } }
 *
 * Accepts:
 *   - already-normalized `{ error: { code, message, ... } }`
 *   - FastAPI `{ detail: { code, message, ... } }`
 *   - FastAPI `{ detail: "string" }` or `{ detail: [{...}] }`
 *   - bare `{ message: "..." }` / `{ code: "..." }`
 *   - null / unknown shapes
 */
function normalizeUpstreamError(
  data: unknown,
  status: number
): { error: { code: string; message: string; details?: unknown; field_errors?: Record<string, string> } } {
  const fallbackCode = defaultCodeForStatus(status);
  const fallbackMessage = defaultMessageForStatus(status);

  if (!data || typeof data !== "object") {
    return { error: { code: fallbackCode, message: fallbackMessage } };
  }

  const obj = data as Record<string, unknown>;

  if (obj.error && typeof obj.error === "object") {
    const e = obj.error as Record<string, unknown>;
    return {
      error: {
        code: typeof e.code === "string" && e.code ? e.code : fallbackCode,
        message: typeof e.message === "string" && e.message ? e.message : fallbackMessage,
        details: e.details,
        field_errors:
          e.field_errors && typeof e.field_errors === "object"
            ? (e.field_errors as Record<string, string>)
            : undefined,
      },
    };
  }

  if ("detail" in obj) {
    const detail = obj.detail;
    if (detail && typeof detail === "object" && !Array.isArray(detail)) {
      const d = detail as Record<string, unknown>;
      return {
        error: {
          code: typeof d.code === "string" && d.code ? d.code : fallbackCode,
          message: typeof d.message === "string" && d.message ? d.message : fallbackMessage,
          details: d.details,
          field_errors:
            d.field_errors && typeof d.field_errors === "object"
              ? (d.field_errors as Record<string, string>)
              : undefined,
        },
      };
    }
    if (typeof detail === "string" && detail) {
      return { error: { code: fallbackCode, message: detail } };
    }
    if (Array.isArray(detail)) {
      return { error: { code: fallbackCode, message: fallbackMessage, details: detail } };
    }
  }

  if (typeof obj.message === "string" && obj.message) {
    return {
      error: {
        code: typeof obj.code === "string" && obj.code ? obj.code : fallbackCode,
        message: obj.message,
      },
    };
  }

  return { error: { code: fallbackCode, message: fallbackMessage } };
}

/**
 * Proxy a Next.js route handler request to the Core BE and return the response.
 *
 * @param req         The incoming NextRequest (used for URL, method, headers).
 * @param corePath    The Core BE path to forward to (e.g. "/v1/conversations").
 * @param options     Optional overrides.
 */
export async function coreProxy(
  req: NextRequest,
  corePath: string,
  options: ProxyOptions = {}
): Promise<NextResponse> {
  const token = await getSessionToken();
  const requireAuth = options.requireAuth ?? true;
  const method = options.method ?? req.method;

  if (requireAuth && !token) {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const isMultipart = options.multipart === true;
  const bodySizeLimit =
    options.bodySizeLimit ?? (isMultipart ? MULTIPART_BODY_LIMIT : JSON_BODY_LIMIT);

  // Build forwarded headers. For multipart we preserve the browser-supplied
  // Content-Type so the boundary stays intact.
  const headers: Record<string, string> = { ...options.extraHeaders };
  if (isMultipart) {
    const incomingCt = req.headers.get("content-type");
    if (incomingCt) headers["Content-Type"] = incomingCt;
  } else {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Build query string from original request
  const url = new URL(corePath, CORE_API_URL);
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  // Build body — enforce size limits to prevent memory exhaustion.
  let bodyForFetch: BodyInit | undefined;
  const isBodyMethod = method !== "GET" && method !== "HEAD" && method !== "DELETE";

  if (options.body !== undefined) {
    bodyForFetch = options.body !== null ? JSON.stringify(options.body) : undefined;
  } else if (isBodyMethod && isMultipart) {
    const contentLengthHeader = req.headers.get("content-length");
    const declaredLength = contentLengthHeader ? Number(contentLengthHeader) : NaN;
    if (Number.isFinite(declaredLength) && declaredLength > bodySizeLimit) {
      return NextResponse.json(
        { error: { code: "PAYLOAD_TOO_LARGE", message: "Upload exceeds maximum allowed size." } },
        { status: 413 }
      );
    }
    try {
      const buffer = await req.arrayBuffer();
      if (buffer.byteLength > bodySizeLimit) {
        return NextResponse.json(
          { error: { code: "PAYLOAD_TOO_LARGE", message: "Upload exceeds maximum allowed size." } },
          { status: 413 }
        );
      }
      bodyForFetch = buffer;
    } catch {
      bodyForFetch = undefined;
    }
  } else if (isBodyMethod) {
    try {
      const rawBody = await req.text();
      if (rawBody && new TextEncoder().encode(rawBody).length > bodySizeLimit) {
        return NextResponse.json(
          { error: { code: "PAYLOAD_TOO_LARGE", message: "Request body exceeds maximum allowed size." } },
          { status: 413 }
        );
      }
      bodyForFetch = rawBody || undefined;
    } catch {
      bodyForFetch = undefined;
    }
  }

  // 30-second upstream timeout prevents indefinite BFF hangs
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const upstream = await fetch(url.toString(), {
      method,
      headers,
      body: bodyForFetch,
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const responseData = await upstream.json().catch(() => null);

    // Sanitize 5xx responses — do not leak stack traces or internal paths to the browser
    if (upstream.status >= 500) {
      return NextResponse.json(
        { error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" } },
        { status: upstream.status }
      );
    }

    // Normalize 4xx responses to the canonical { error: { code, message, ... } } shape.
    // FastAPI sometimes returns { "detail": "..." } or { "detail": { ... } }; the
    // browser-side parseApiError handles both, but normalising at the proxy edge
    // means every consumer in the app sees the same contract.
    if (upstream.status >= 400) {
      const normalized = normalizeUpstreamError(responseData, upstream.status);
      return NextResponse.json(normalized, { status: upstream.status });
    }

    return NextResponse.json(responseData ?? {}, { status: upstream.status });
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        error: {
          code: isTimeout ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE",
          message: isTimeout
            ? "Core service request timed out."
            : "Core service is temporarily unavailable.",
        },
      },
      { status: isTimeout ? 504 : 503 }
    );
  }
}

/**
 * Simple proxy that copies the body from the request and forwards it.
 * Convenience wrapper for single-path endpoints.
 */
export async function forwardToCore(
  req: NextRequest,
  corePath: string,
  method?: string,
  requireAuth = true
): Promise<NextResponse> {
  return coreProxy(req, corePath, { method, requireAuth });
}

/**
 * B7 P6 — streaming pass-through used by the AI chat SSE endpoint.
 *
 * Returns the raw upstream `Response` (no envelope normalization, body
 * untouched) so the route handler can pipe the SSE stream straight to the
 * browser. Adds the same Authorization header + size-limited JSON body
 * forwarding as `coreProxy`.
 *
 * Headers the route handler should set on the outer Response:
 *   - "Content-Type": "text/event-stream"
 *   - "Cache-Control": "no-cache, no-transform"
 *   - "X-Accel-Buffering": "no"
 */
export async function coreFetchStream(
  req: NextRequest,
  corePath: string,
  options: { method?: string; bodySizeLimit?: number; requireAuth?: boolean } = {},
): Promise<Response> {
  const token = await getSessionToken();
  const requireAuth = options.requireAuth ?? true;
  if (requireAuth && !token) {
    return new Response(
      JSON.stringify({
        error: { code: "AUTH_REQUIRED", message: "Authentication required." },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const method = options.method ?? req.method;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = new URL(corePath, CORE_API_URL);
  req.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));

  let body: BodyInit | undefined;
  if (method !== "GET" && method !== "HEAD") {
    const limit = options.bodySizeLimit ?? JSON_BODY_LIMIT;
    try {
      const raw = await req.text();
      if (raw.length > limit) {
        return new Response(
          JSON.stringify({
            error: { code: "PAYLOAD_TOO_LARGE", message: "Request body too large." },
          }),
          { status: 413, headers: { "Content-Type": "application/json" } },
        );
      }
      body = raw;
    } catch {
      body = undefined;
    }
  }

  // B7 review P1-2 — propagate the inbound AbortSignal so client cancellation
  // (Stop-generation button → AbortController.abort()) tears down the
  // upstream Core fetch immediately. Without this, BFF kept reading SSE
  // chunks from Core (and Core kept paying the AI worker for tokens) long
  // after the browser closed its connection.
  // No timeout here — SSE connections are intentionally long-lived.
  return fetch(url.toString(), {
    method,
    headers,
    body,
    cache: "no-store",
    signal: req.signal,
  });
}
