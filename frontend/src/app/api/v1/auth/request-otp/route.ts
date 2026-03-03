/**
 * BFF Auth — request OTP (email).
 * POST /api/v1/auth/request-otp
 *
 * Proxies to Core BE: POST /v1/auth/request-otp
 */
import { NextRequest, NextResponse } from "next/server";

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
    res = await fetch(`${CORE_API_URL}/v1/auth/request-otp`, {
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

  return NextResponse.json(data, { status: res.status });
}

