/**
 * BFF Auth — complete password reset.
 * POST /api/v1/auth/reset-password
 *
 * Proxies to Core BE: POST /v1/auth/reset-password
 * Requires a prior successful verify-otp call with purpose=reset_password.
 */
import { NextRequest, NextResponse } from "next/server";

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
    res = await fetchWithTimeout(`${CORE_API_URL}/v1/auth/reset-password`, {
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

  return NextResponse.json(data, { status: res.status });
}
