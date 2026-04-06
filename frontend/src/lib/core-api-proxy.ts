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
};

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

  // Build forwarded headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.extraHeaders,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Build query string from original request
  const url = new URL(corePath, CORE_API_URL);
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  // Build body — enforce a 1 MiB limit to prevent memory exhaustion
  const BODY_SIZE_LIMIT = 1_048_576; // 1 MiB
  let bodyStr: string | undefined;
  if (options.body !== undefined) {
    bodyStr = options.body !== null ? JSON.stringify(options.body) : undefined;
  } else if (method !== "GET" && method !== "HEAD" && method !== "DELETE") {
    try {
      const rawBody = await req.text();
      if (rawBody && new TextEncoder().encode(rawBody).length > BODY_SIZE_LIMIT) {
        return NextResponse.json(
          { error: { code: "PAYLOAD_TOO_LARGE", message: "Request body exceeds maximum allowed size." } },
          { status: 413 }
        );
      }
      bodyStr = rawBody || undefined;
    } catch {
      bodyStr = undefined;
    }
  }

  // 30-second upstream timeout prevents indefinite BFF hangs
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const upstream = await fetch(url.toString(), {
      method,
      headers,
      body: bodyStr,
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
