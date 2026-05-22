import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { REFRESH_COOKIE_NAME } from "@/lib/bff-auth-cookie";
import {
  applyAuthCookies,
  clearAuthCookies,
  refreshCoreAuth,
  sessionUserFromCoreAuth,
} from "@/lib/bff-auth-session";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/bff-rate-limit";

export async function POST(req: NextRequest) {
  const refreshToken = (await cookies()).get(REFRESH_COOKIE_NAME)?.value ?? null;
  if (!refreshToken) {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "No refresh session available." } },
      { status: 401 },
    );
  }

  // Key by token hash — prevents IP-based tab-storm lockout and token-theft pooling (RT-6).
  const principal = createHash("sha256").update(refreshToken).digest("hex");
  const limited = await enforceRateLimit(req, { ...RATE_LIMITS["auth:refresh"], principal });
  if (limited) return limited;

  const refreshed = await refreshCoreAuth(refreshToken);
  if (!refreshed.ok) {
    const response = NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "Session expired. Please sign in again." } },
      { status: 401 },
    );
    clearAuthCookies(response);
    return response;
  }

  const response = NextResponse.json(
    { data: sessionUserFromCoreAuth(refreshed.auth) },
    { status: 200 },
  );
  applyAuthCookies(response, refreshed.auth);
  return response;
}
