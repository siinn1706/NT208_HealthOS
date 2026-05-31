/**
 * BFF CSRF / Origin guard.
 *
 * Defends against cross-site state-changing requests by verifying the
 * Origin or Referer header on every mutating method (POST / PUT / PATCH / DELETE).
 *
 * OAuth provider callbacks are GET-initiated and are therefore a no-op
 * through the safe-method bypass below.
 *
 * Usage:
 *   const csrfReject = assertSameOrigin(req);
 *   if (csrfReject) return csrfReject;
 */

import { NextRequest, NextResponse } from "next/server";
import { BFF_CSRF_GUARD_MODE, BFF_TRUSTED_ORIGINS, isProtectedAppEnv } from "@/lib/env";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Request path prefixes exempt from the CSRF guard (e.g. token-authenticated public endpoints). */
export const EXEMPT_PATH_PREFIXES = ["/api/v1/public/"] as const;

let _coldStartChecked = false;

function checkColdStart(isProd: boolean, allowedOrigins: string[]): void {
  if (_coldStartChecked) return;
  _coldStartChecked = true;
  if (isProd && allowedOrigins.length === 0) {
    console.error(
      JSON.stringify({
        event: "csrf.guard.cold_start_empty_allow_list",
        level: "CRITICAL",
        message:
          "BFF_TRUSTED_ORIGINS is empty in production. Every mutating request without a matching Origin/Referer will be rejected.",
      }),
    );
  }
}

/** Parse and normalize a raw origins env string into a set of allowed host:port strings. */
export function parseAllowedOrigins(rawEnv: string, isProd: boolean): string[] {
  const explicit: string[] = rawEnv
    .split(",")
    .flatMap((urlStr) => {
      urlStr = urlStr.trim();
      if (!urlStr) return [];
      try {
        const u = new URL(urlStr);
        return [u.host]; // "example.com" or "example.com:8080"
      } catch {
        return [];
      }
    });

  if (!isProd) {
    // Dev: accept any localhost / 127.0.0.1 port without explicit listing.
    return explicit;
  }

  return explicit;
}

function isLocalhostHost(host: string): boolean {
  // Matches localhost[:port] and 127.0.0.1[:port]
  return /^localhost(:\d+)?$/.test(host) || /^127\.0\.0\.1(:\d+)?$/.test(host);
}

/** Core match logic — exported for unit tests. */
export function originMatches(
  candidateHost: string,
  allowedHosts: string[],
  requestHost: string,
  isProd: boolean,
): boolean {
  // Explicit allow-list check (works for both prod and dev).
  if (allowedHosts.includes(candidateHost)) return true;

  if (!isProd) {
    // Dev: implicit localhost / 127.0.0.1 allowance.
    if (isLocalhostHost(candidateHost)) return true;
    // Dev: same-Host fallback (NOT available in production — Host is operator-supplied input).
    if (candidateHost === requestHost) return true;
  }

  return false;
}

function extractHost(headerValue: string): string | null {
  if (!headerValue) return null;
  try {
    const u = new URL(headerValue);
    return u.host || null;
  } catch {
    return null;
  }
}

/** Log a rejection event, stripping path/query/fragment from the origin to avoid token leakage. */
function logReject(headerValue: string, path: string): void {
  const safeHost = extractHost(headerValue) ?? "unknown";
  console.warn(
    JSON.stringify({
      event: "csrf.guard.rejected",
      origin_host: safeHost, // host:port only — no path, no query, no fragment
      path,
    }),
  );
}

/**
 * Assert that the request origin matches the configured allow-list.
 *
 * Returns null on pass (request should proceed), or a 403 NextResponse on rejection.
 *
 * In non-protected dry-run mode (`BFF_CSRF_GUARD_MODE=dry-run`) the guard logs but never returns 403.
 */
export function assertSameOrigin(req: NextRequest): NextResponse | null {
  const method = req.method?.toUpperCase();
  if (!MUTATING_METHODS.has(method)) return null;

  const path = req.nextUrl.pathname;

  // Exempt path prefixes (e.g. public emergency token endpoints).
  if (EXEMPT_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) return null;

  const isProtectedEnv = isProtectedAppEnv();
  const allowedHosts = parseAllowedOrigins(BFF_TRUSTED_ORIGINS.join(","), isProtectedEnv);
  checkColdStart(isProtectedEnv, allowedHosts);

  const requestHost = req.headers.get("host") ?? "";

  // Prefer Origin header; fall back to Referer.
  const originHeader = req.headers.get("origin");
  const refererHeader = req.headers.get("referer");
  const candidateHeader = originHeader ?? refererHeader ?? "";
  const candidateHost = extractHost(candidateHeader);

  if (candidateHost && originMatches(candidateHost, allowedHosts, requestHost, isProtectedEnv)) {
    return null; // Pass.
  }

  // No matching origin.
  const isDryRun = BFF_CSRF_GUARD_MODE === "dry-run";

  if (isDryRun) {
    console.warn(
      JSON.stringify({
        event: "csrf.guard.dry_run_pass",
        origin_host: candidateHost ?? "missing",
        path,
      }),
    );
    return null;
  }

  logReject(candidateHeader, path);
  return NextResponse.json(
    { error: { code: "CSRF_ORIGIN_REJECTED", message: "Invalid request origin." } },
    { status: 403 },
  );
}
