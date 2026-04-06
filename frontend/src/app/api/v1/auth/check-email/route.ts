/**
 * BFF Auth — check email availability.
 * GET /api/v1/auth/check-email?email=xxx
 *
 * Proxies to Core BE: GET /v1/auth/check-email
 */
import { NextRequest, NextResponse } from "next/server";

import { CORE_API_URL } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/bff-fetch-utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "email query parameter is required." } },
      { status: 400 }
    );
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(`${CORE_API_URL}/v1/auth/check-email?email=${encodeURIComponent(email)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
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
