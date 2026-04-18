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
  META_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_SECURE,
} from "@/lib/bff-auth-cookie";

import { CORE_API_URL } from "@/lib/env";
import { fetchWithTimeout, parseJsonBody } from "@/lib/bff-fetch-utils";

export async function POST(req: NextRequest) {
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

  // For signup/login: Core BE returns access_token — store in httpOnly cookie.
  const bodyObj = body as Record<string, unknown>;
  const accessToken: string | undefined = (data as Record<string, unknown> & { data?: Record<string, unknown> })?.data?.access_token as string | undefined;
  if (res.ok && accessToken && bodyObj.purpose !== "reset_password") {
    const response = NextResponse.json(
      {
        data: {
          user_id: (data as { data: { user_id: string } }).data.user_id,
          email: (data as { data: { email: string } }).data.email,
          username: (data as { data: { username?: string } }).data.username ?? null,
          display_name: (data as { data: { display_name: string } }).data.display_name,
          avatar_url: (data as { data: { avatar_url?: string } }).data.avatar_url ?? null,
          onboarding_status: (data as { data: { onboarding_status?: string } }).data.onboarding_status ?? "pending",
        },
      },
      { status: res.status }
    );

    response.cookies.set(SESSION_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: SESSION_COOKIE_SECURE,
      sameSite: "lax",
      maxAge: SESSION_COOKIE_MAX_AGE,
      path: "/",
    });

    // Non-httpOnly meta cookie for middleware onboarding gate
    response.cookies.set(
      META_COOKIE_NAME,
      JSON.stringify({ onboarding_status: (data as { data: { onboarding_status?: string } }).data.onboarding_status ?? "pending" }),
      { httpOnly: false, secure: SESSION_COOKIE_SECURE, sameSite: "lax", maxAge: SESSION_COOKIE_MAX_AGE, path: "/" }
    );

    return response;
  }

  // reset_password or error — proxy as-is
  return NextResponse.json(data, { status: res.status });
}
