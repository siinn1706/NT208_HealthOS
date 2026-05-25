/**
 * BFF admin guard — validates that the inbound request carries a valid admin
 * session before any admin route handler forwards to Core.
 *
 * Usage:
 *   const deny = await requireAdminSession(request);
 *   if (deny) return deny;
 *   // … proceed with coreProxy(…)
 *
 * Requirements: 3.9, 3.10
 */

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";
import { filterIdentifierArray, readCoreSessionSnapshot } from "@/lib/bff-auth-session";
import { CORE_API_URL } from "@/lib/env";
import { normalizeCoreError } from "@/lib/bff-error-normalize";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "@/lib/request-id";
import { isAdmin } from "@/lib/admin/admin-session";

const ADMIN_ME_TIMEOUT_MS = 5_000;

/**
 * Fetch the session token from the cookie store.
 * Returns null if the cookie is absent or the store is unavailable.
 */
async function getSessionToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Call Core's /v1/auth/me with the given bearer token and a 5-second timeout.
 * Returns the raw Response, or null on transport/timeout failure.
 */
async function fetchAuthMe(
  token: string,
  requestId: string,
): Promise<Response | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ADMIN_ME_TIMEOUT_MS);
  try {
    const res = await fetch(`${CORE_API_URL}/v1/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        [REQUEST_ID_HEADER]: requestId,
      },
      cache: "no-store",
      signal: controller.signal,
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Guard for all BFF admin route handlers.
 *
 * - No session cookie → 401 AUTH_REQUIRED
 * - Core /v1/auth/me returns 401 → 401 AUTH_REQUIRED
 * - Core /v1/auth/me transport failure / timeout → 502 UPSTREAM_ERROR
 * - isAdmin(roles, permissions) === false → 403 FORBIDDEN
 * - Admin session confirmed → returns null (caller proceeds)
 *
 * @param request  The incoming NextRequest (used for request-id propagation).
 * @returns        A NextResponse to short-circuit with, or null on success.
 */
export async function requireAdminSession(
  request: NextRequest,
): Promise<NextResponse | null> {
  const requestId = getOrCreateRequestId(request);

  // ── 1. Session cookie presence check ────────────────────────────────────
  const token = await getSessionToken();
  if (!token) {
    const res = NextResponse.json(
      { error: { code: "AUTH_REQUIRED" } },
      { status: 401 },
    );
    res.headers.set(REQUEST_ID_HEADER, requestId);
    return res;
  }

  // ── 2. Validate session against Core /v1/auth/me ─────────────────────────
  const meResponse = await fetchAuthMe(token, requestId);

  if (!meResponse) {
    // Transport failure or timeout
    const res = NextResponse.json(
      normalizeCoreError(null, 502),
      { status: 502 },
    );
    res.headers.set(REQUEST_ID_HEADER, requestId);
    return res;
  }

  if (meResponse.status === 401) {
    const body = await meResponse.json().catch(() => null);
    const res = NextResponse.json(
      { error: { code: "AUTH_REQUIRED", ...((body as Record<string, unknown>)?.error as object | undefined) } },
      { status: 401 },
    );
    res.headers.set(REQUEST_ID_HEADER, requestId);
    return res;
  }

  if (!meResponse.ok) {
    const body = await meResponse.json().catch(() => null);
    const normalized = normalizeCoreError(body, meResponse.status);
    const res = NextResponse.json(normalized, { status: meResponse.status });
    res.headers.set(REQUEST_ID_HEADER, requestId);
    return res;
  }

  // ── 3. Extract roles/permissions and check admin status ──────────────────
  const payload = await meResponse.json().catch(() => null);
  const snapshot = readCoreSessionSnapshot(payload);

  const roles = snapshot
    ? snapshot.roles
    : filterIdentifierArray(
        (payload as Record<string, unknown> | null)?.roles,
        32,
        1,
        64,
      );

  const permissions = snapshot
    ? snapshot.permissions
    : filterIdentifierArray(
        (payload as Record<string, unknown> | null)?.permissions,
        256,
        1,
        128,
      );

  if (!isAdmin(roles, permissions)) {
    const res = NextResponse.json(
      { error: { code: "FORBIDDEN" } },
      { status: 403 },
    );
    res.headers.set(REQUEST_ID_HEADER, requestId);
    return res;
  }

  // ── 4. Admin confirmed — let the caller proceed ──────────────────────────
  return null;
}
