/**
 * BFF Auth — request OTP (email).
 * POST /api/v1/auth/request-otp
 *
 * Proxies to Core BE: POST /v1/auth/request-otp
 */
import { NextRequest, NextResponse } from "next/server";

import { CORE_API_URL } from "@/lib/env";
import { fetchWithTimeout, parseJsonBody } from "@/lib/bff-fetch-utils";
import { assertSameOrigin } from "@/lib/bff-origin-guard";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/bff-rate-limit";
import { normalizeCoreError } from "@/lib/bff-error-normalize";

export async function POST(req: NextRequest) {
  const csrfReject = assertSameOrigin(req);
  if (csrfReject) return csrfReject;

  const limited = await enforceRateLimit(req, RATE_LIMITS["auth:otp_request"]);
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
    res = await fetchWithTimeout(`${CORE_API_URL}/v1/auth/request-otp`, {
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

  return NextResponse.json(data, { status: res.status });
}
