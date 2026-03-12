/**
 * BFF Auth — verify OTP (email) and get token.
 * POST /api/v1/auth/verify-otp
 *
 * Proxies to Core BE: POST /v1/auth/verify-otp
 * For signup/login purposes: sets session token as httpOnly cookie.
 * For reset_password purpose: just proxies the response (no cookie).
 */
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_MAX_AGE, SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";

const CORE_API_URL = process.env.CORE_API_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid JSON body." } },
      { status: 400 }
    );
  }

  let res: Response;
  try {
    res = await fetch(`${CORE_API_URL}/v1/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore – Next.js fetch extension
      next: { revalidate: 0 },
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
  const accessToken: string | undefined = data?.data?.access_token;
  if (res.ok && accessToken && body.purpose !== "reset_password") {
    const response = NextResponse.json(
      {
        data: {
          user_id: data.data.user_id,
          email: data.data.email,
          display_name: data.data.display_name,
          avatar_url: data.data.avatar_url ?? null,
        },
      },
      { status: res.status }
    );

    response.cookies.set(SESSION_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_COOKIE_MAX_AGE,
      path: "/",
    });

    return response;
  }

  // reset_password or error — proxy as-is
  return NextResponse.json(data, { status: res.status });
}
