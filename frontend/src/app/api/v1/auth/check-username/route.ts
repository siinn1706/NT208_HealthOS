/**
 * BFF Auth — check username availability.
 * GET /api/v1/auth/check-username?username=xxx
 *
 * Proxies to Core BE: GET /v1/auth/check-username
 */
import { NextRequest, NextResponse } from "next/server";

import { CORE_API_URL } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/bff-fetch-utils";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/bff-rate-limit";
import { normalizeCoreError } from "@/lib/bff-error-normalize";

export async function GET(req: NextRequest) {
  const limited = await enforceRateLimit(req, RATE_LIMITS["auth:availability_username"]);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "username query parameter is required." } },
      { status: 400 }
    );
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(`${CORE_API_URL}/v1/auth/check-username?username=${encodeURIComponent(username)}`, {
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

  if (!res.ok) {
    return NextResponse.json(normalizeCoreError(data, res.status), { status: res.status });
  }

  return NextResponse.json(data, { status: res.status });
}
