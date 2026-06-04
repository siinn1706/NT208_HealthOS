/**
 * BFF WS-Token — /api/v1/auth/ws-token
 * GET → exchange session cookie OR bearer token for a short-lived Core WS ticket.
 * Dual-auth via getBffAuthContext (cookie precedence).
 */
import { NextRequest, NextResponse } from "next/server";
import { getBffAuthContext } from "@/lib/bff-auth-context";
import { CORE_API_URL } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/bff-fetch-utils";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/bff-rate-limit";

const COOKIE_PRESENT_RATE_LIMIT = {
  ...RATE_LIMITS["auth:ws_token"],
  key: "auth:ws_token:session_cookie",
  fallbackPrincipal: "session-cookie-present",
  logUnresolvedIp: false,
};

export async function GET(req: NextRequest) {
  const ctx = await getBffAuthContext(req);

  if (ctx.kind === "cookie") {
    const cookieLimited = await enforceRateLimit(req, COOKIE_PRESENT_RATE_LIMIT);
    if (cookieLimited) return cookieLimited;
  }

  const limiterOptions = ctx.principal
    ? { ...RATE_LIMITS["auth:ws_token"], principal: ctx.principal }
    : RATE_LIMITS["auth:ws_token"];
  const limited = await enforceRateLimit(req, limiterOptions);
  if (limited) return limited;

  if (!ctx.token) {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "No active session." } },
      { status: 401 }
    );
  }

  try {
    const upstream = await fetchWithTimeout(`${CORE_API_URL}/v1/auth/ws-ticket`, {
      method: "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ctx.token}` },
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
      data: {
        token: payload.data.ws_ticket,
        expires_in_seconds: payload.data.expires_in_seconds ?? 120,
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "UPSTREAM_UNAVAILABLE", message: "Core service is temporarily unavailable." } },
      { status: 503 }
    );
  }
}
