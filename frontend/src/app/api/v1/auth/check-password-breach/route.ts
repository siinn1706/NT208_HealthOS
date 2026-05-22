/**
 * BFF Auth — check if password has been in a data breach (HIBP).
 * POST /api/v1/auth/check-password-breach
 *
 * Deprecated: use GET /check-password-breach/range/[prefix] instead.
 * Kept for backwards compatibility with lower rate-limit cap.
 */
import { NextRequest, NextResponse } from "next/server";

import { CORE_API_URL } from "@/lib/env";
import { fetchWithTimeout, parseJsonBody } from "@/lib/bff-fetch-utils";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/bff-rate-limit";
import { normalizeCoreError } from "@/lib/bff-error-normalize";

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, RATE_LIMITS["auth:pwned_range_post_legacy"]);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await parseJsonBody(req);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status === 413 ? 413 : 400;
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: status === 413 ? "Request body too large." : "password is required." } },
      { status }
    );
  }

  const bodyObj = body as Record<string, unknown>;
  if (!bodyObj?.password) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "password is required." } },
      { status: 400 }
    );
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(`${CORE_API_URL}/v1/auth/check-password-breach`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: bodyObj.password }),
    });
  } catch {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "Could not reach Core API." } },
      { status: 502 }
    );
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(normalizeCoreError(data, res.status), { status: res.status });
  }
  return NextResponse.json(data, { status: res.status });
}
