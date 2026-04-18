/**
 * BFF — POST multipart avatar to Core BE /v1/users/me/avatar.
 */
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";
import { CORE_API_URL } from "@/lib/env";

async function getAccessToken(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(SESSION_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

function unauthorized() {
  return NextResponse.json(
    { error: { code: "AUTH_REQUIRED", message: "Authentication required." } },
    { status: 401 }
  );
}

export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) return unauthorized();

  try {
    const body = await req.formData();
    const res = await fetch(`${CORE_API_URL}/v1/users/me/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: { code: "UPSTREAM_UNAVAILABLE", message: "Core service is temporarily unavailable." } },
      { status: 503 }
    );
  }
}
