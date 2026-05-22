/**
 * BFF WS-Token — /api/v1/auth/ws-token
 * GET → exchange session cookie for a short-lived Core WS ticket.
 */
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";

import { CORE_API_URL } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/bff-fetch-utils";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/bff-rate-limit";

export async function GET(req: NextRequest) {
  const limited = await enforceRateLimit(req, RATE_LIMITS["auth:ws_token"]);
  if (limited) return limited;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;

  if (!accessToken) {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "No active session." } },
      { status: 401 }
    );
  }

  try {
    const upstream = await fetchWithTimeout(`${CORE_API_URL}/v1/auth/ws-ticket`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok || !payload?.data?.ws_ticket) {
      return NextResponse.json(
        payload ?? { error: { code: "UPSTREAM_ERROR", message: "Failed to issue WS ticket." } },
        { status: upstream.status || 502 }
      );
    }

    return NextResponse.json({
      token: payload.data.ws_ticket,
      expires_in_seconds: payload.data.expires_in_seconds ?? 120,
    });
  } catch {
    return NextResponse.json(
      { error: { code: "UPSTREAM_UNAVAILABLE", message: "Core service is temporarily unavailable." } },
      { status: 503 }
    );
  }
}
