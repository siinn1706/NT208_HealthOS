/**
 * BFF Auth — session endpoint.
 *
 * GET    /api/v1/auth/session  → return current user from httpOnly cookie
 * POST   /api/v1/auth/session  → login with email+password, set httpOnly cookies
 * DELETE /api/v1/auth/session  → logout, clear auth cookies
 */

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  META_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE,
  SESSION_COOKIE_NAME,
} from "@/lib/bff-auth-cookie";
import {
  applyAuthCookies,
  clearAuthCookies,
  readCoreAuthPayload,
  revokeCoreSession,
  sessionUserFromCoreAuth,
} from "@/lib/bff-auth-session";
import { assertSameOrigin } from "@/lib/bff-origin-guard";
import { CORE_API_URL } from "@/lib/env";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/bff-rate-limit";
import { normalizeCoreError } from "@/lib/bff-error-normalize";

// ── Dev bypass ───────────────────────────────────────────────────────────────
// Set DEV_BYPASS_CREDENTIALS in .env.local as "identifier:password" pairs.
// Example: DEV_BYPASS_CREDENTIALS=admin:admin,test@x.com:pass
const DEV_BYPASS_PREFIX = "DEV_BYPASS:";

function getDevBypassMap(): Map<string, { email: string; display_name: string }> {
  const map = new Map<string, { email: string; display_name: string }>();
  if (process.env.NODE_ENV === "production") return map;

  const raw = process.env.DEV_BYPASS_CREDENTIALS;
  if (!raw) return map;
  for (const entry of raw.split(",")) {
    const [loginId, password] = entry.trim().split(":");
    if (loginId && password) {
      const email = loginId.includes("@") ? loginId : `${loginId}@healthos.local`;
      map.set(`${loginId}::${password}`, { email, display_name: loginId });
    }
  }
  return map;
}

function makeDevToken(email: string): string {
  return `${DEV_BYPASS_PREFIX}${email}`;
}

function parseDevToken(token: string): { email: string; display_name: string } | null {
  if (!token.startsWith(DEV_BYPASS_PREFIX)) return null;
  const email = token.slice(DEV_BYPASS_PREFIX.length);
  return { email, display_name: email.split("@")[0] };
}

// ── GET /api/v1/auth/session → Return current user ──────────────────────────
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "No active session." } },
      { status: 401 },
    );
  }

  if (process.env.NODE_ENV !== "production") {
    const devUser = parseDevToken(token);
    if (devUser) {
      return NextResponse.json({
        data: {
          user_id: "00000000-0000-0000-0000-000000000001",
          email: devUser.email,
          username: devUser.email.split("@")[0],
          display_name: devUser.display_name,
          avatar_url: null,
          onboarding_status: "completed",
        },
      });
    }
  }

  try {
    const res = await fetch(`${CORE_API_URL}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const response = NextResponse.json(
        data ?? { error: { code: "AUTH_REQUIRED", message: "Session expired." } },
        { status: 401 },
      );
      clearAuthCookies(response);
      return response;
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "Could not reach Core API." } },
      { status: 502 },
    );
  }
}

// ── POST /api/v1/auth/session → Login, set cookies ──────────────────────────
export async function POST(req: NextRequest) {
  const csrfReject = assertSameOrigin(req);
  if (csrfReject) return csrfReject;

  const body = await req.json().catch(() => null);
  if (!body?.identifier || !body?.password) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "identifier and password are required." } },
      { status: 400 },
    );
  }

  // Pre-bypass: dev-only short-circuit MUST run before limiter so hot-reload login loop is not throttled (RT-11).
  if (process.env.NODE_ENV !== "production") {
    const devMap = getDevBypassMap();
    const key = `${body.identifier}::${body.password}`;
    const devUser = devMap.get(key);
    if (devUser) {
      const response = NextResponse.json({
        data: {
          user_id: "00000000-0000-0000-0000-000000000001",
          email: devUser.email,
          username: devUser.email.split("@")[0],
          display_name: devUser.display_name,
          avatar_url: null,
          onboarding_status: "completed",
        },
      });
      response.cookies.set(SESSION_COOKIE_NAME, makeDevToken(devUser.email), {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: SESSION_COOKIE_MAX_AGE,
        path: "/",
      });
      response.cookies.set(
        META_COOKIE_NAME,
        JSON.stringify({ onboarding_status: "completed" }),
        { httpOnly: true, secure: false, sameSite: "lax", maxAge: SESSION_COOKIE_MAX_AGE, path: "/" },
      );
      response.cookies.delete(REFRESH_COOKIE_NAME);
      return response;
    }
  }

  try {
    const limited = await enforceRateLimit(req, RATE_LIMITS["auth:login"]);
    if (limited) return limited;

    const coreRes = await fetch(`${CORE_API_URL}/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: body.identifier, password: body.password }),
      cache: "no-store",
    });

    const data = await coreRes.json().catch(() => null);
    if (!coreRes.ok) {
      return NextResponse.json(
        normalizeCoreError(data, coreRes.status),
        { status: coreRes.status },
      );
    }

    const auth = readCoreAuthPayload(data);
    if (!auth) {
      return NextResponse.json(
        { error: { code: "UPSTREAM_ERROR", message: "Core API returned no token." } },
        { status: 502 },
      );
    }

    const response = NextResponse.json(
      { data: sessionUserFromCoreAuth(auth) },
      { status: 200 },
    );
    applyAuthCookies(response, auth);
    return response;
  } catch {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "Could not reach Core API." } },
      { status: 502 },
    );
  }
}

// ── DELETE /api/v1/auth/session → Logout, clear cookies ─────────────────────
export async function DELETE(req: NextRequest) {
  const csrfReject = assertSameOrigin(req);
  if (csrfReject) return csrfReject;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value ?? null;

  await revokeCoreSession(accessToken, refreshToken);

  const response = NextResponse.json({ data: { success: true } }, { status: 200 });
  clearAuthCookies(response);
  return response;
}
