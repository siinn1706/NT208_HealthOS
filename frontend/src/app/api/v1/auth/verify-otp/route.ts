/**
 * BFF Auth — verify OTP (email) and get token.
 * POST /api/v1/auth/verify-otp
 *
 * Proxies to Core BE: POST /v1/auth/verify-otp
 * For signup/login purposes: sets session token as httpOnly cookie.
 * For reset_password purpose: just proxies the response (no cookie).
 */
import { NextRequest, NextResponse } from "next/server";
import {
  applyAuthCookies,
  readCoreAuthPayload,
  sessionUserFromCoreAuth,
} from "@/lib/bff-auth-session";

import { CORE_API_URL } from "@/lib/env";
import { fetchWithTimeout, parseJsonBody } from "@/lib/bff-fetch-utils";
import { assertSameOrigin } from "@/lib/bff-origin-guard";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/bff-rate-limit";
import { normalizeCoreError } from "@/lib/bff-error-normalize";

export async function POST(req: NextRequest) {
  const csrfReject = assertSameOrigin(req);
  if (csrfReject) return csrfReject;

  const limited = await enforceRateLimit(req, RATE_LIMITS["auth:otp_verify"]);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await parseJsonBody(req);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status === 413 ? 413 : 400;
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: status === 413 ? "Request body too large." : "Invalid JSON body." } },
      { status }
    );
  }

  if (!body) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid JSON body." } },
      { status: 400 }
    );
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(`${CORE_API_URL}/v1/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "Could not reach Core API." } },
      { status: 502 }
    );
  }

  const data = await res.json().catch(() => null);
  if (data === null) {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "Core API returned invalid JSON." } },
      { status: 502 }
    );
  }

  if (!res.ok) {
    return NextResponse.json(normalizeCoreError(data, res.status), { status: res.status });
  }

  // For signup/login: Core BE returns tokens — store them in httpOnly cookies.
  const bodyObj = body as Record<string, unknown>;
  const auth = readCoreAuthPayload(data);
  if (bodyObj.purpose !== "reset_password" && !auth) {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "Core API returned no token." } },
      { status: 502 },
    );
  }
  if (auth && bodyObj.purpose !== "reset_password") {
    const response = NextResponse.json(
      { data: sessionUserFromCoreAuth(auth) },
      { status: res.status },
    );
    applyAuthCookies(response, auth);
    return response;
  }

  // reset_password — proxy as-is
  return NextResponse.json(data, { status: res.status });
}
