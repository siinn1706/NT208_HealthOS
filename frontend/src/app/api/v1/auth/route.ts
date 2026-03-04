/**
 * BFF Auth — session endpoint.
 *
 * GET    /api/v1/auth/session  → return current user from httpOnly cookie
 * POST   /api/v1/auth/session  → login with email+password, set httpOnly cookie
 * DELETE /api/v1/auth/session  → logout, clear httpOnly cookie
 */
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const CORE_API_URL = process.env.CORE_API_URL ?? "http://localhost:8000";
const COOKIE_NAME = "core_access_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// ── GET /api/v1/auth/session → Return current user ──────────────────────────
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "No active session." } },
      { status: 401 }
    );
  }

  try {
    const res = await fetch(`${CORE_API_URL}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      // Token invalid/expired — clear cookie
      const response = NextResponse.json(
        data ?? { error: { code: "AUTH_REQUIRED", message: "Session expired." } },
        { status: 401 }
      );
      response.cookies.delete(COOKIE_NAME);
      return response;
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "Could not reach Core API." } },
      { status: 502 }
    );
  }
}

// ── POST /api/v1/auth/session → Login, set cookie ───────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "email and password are required." } },
      { status: 400 }
    );
  }

  try {
    const coreRes = await fetch(`${CORE_API_URL}/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password }),
      cache: "no-store",
    });

    const data = await coreRes.json().catch(() => null);
    if (!coreRes.ok) {
      return NextResponse.json(
        data ?? { error: { code: "AUTH_FAILED", message: "Login failed." } },
        { status: coreRes.status }
      );
    }

    const accessToken: string | undefined = data?.data?.access_token;
    if (!accessToken) {
      return NextResponse.json(
        { error: { code: "UPSTREAM_ERROR", message: "Core API returned no token." } },
        { status: 502 }
      );
    }

    const response = NextResponse.json(
      {
        data: {
          user_id: data.data.user_id,
          email: data.data.email,
          display_name: data.data.display_name,
          avatar_url: data.data.avatar_url ?? null,
        },
      },
      { status: 200 }
    );

    response.cookies.set(COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "Could not reach Core API." } },
      { status: 502 }
    );
  }
}

// ── DELETE /api/v1/auth/session → Logout, clear cookie ──────────────────────
export async function DELETE() {
  const response = NextResponse.json({ data: { success: true } }, { status: 200 });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
