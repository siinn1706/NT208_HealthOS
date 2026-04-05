/**
 * BFF Auth — check if password has been in a data breach (HIBP).
 * POST /api/v1/auth/check-password-breach
 *
 * Calls Core BE: POST /v1/auth/check-password-breach
 */
import { NextRequest, NextResponse } from "next/server";

const CORE_API_URL = process.env.CORE_API_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.password) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "password is required." } },
      { status: 400 }
    );
  }

  let res: Response;
  try {
    res = await fetch(`${CORE_API_URL}/v1/auth/check-password-breach`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: body.password }),
    });
  } catch {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "Could not reach Core API." } },
      { status: 502 }
    );
  }

  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}
