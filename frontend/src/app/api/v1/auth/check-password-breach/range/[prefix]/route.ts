/**
 * BFF Auth — HIBP k-anonymity range proxy.
 *
 * GET /api/v1/auth/check-password-breach/range/{prefix}
 *
 * Forwards to Core BE: GET /v1/auth/check-password-breach/range/{prefix}
 *
 * The browser computes ``SHA1(password).upper()`` locally and sends only the
 * first 5 hex characters here. This route is a thin proxy — Core hits HIBP's
 * `range` API and returns the matching `SUFFIX:COUNT` lines as plain text.
 * The plaintext password never crosses any network or backend boundary.
 *
 * Replaces the legacy `POST /api/v1/auth/check-password-breach` route which
 * sent the raw password and is kept only for backwards compatibility.
 */
import { NextRequest, NextResponse } from "next/server";

import { CORE_API_URL } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/bff-fetch-utils";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/bff-rate-limit";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ prefix: string }> },
) {
  const limited = await enforceRateLimit(req, RATE_LIMITS["auth:pwned_range_get"]);
  if (limited) return limited;

  const { prefix } = await ctx.params;
  if (!/^[0-9A-Fa-f]{5}$/.test(prefix)) {
    return NextResponse.json(
      { error: { code: "INVALID_PREFIX", message: "Prefix must be 5 hex characters." } },
      { status: 400 },
    );
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${CORE_API_URL}/v1/auth/check-password-breach/range/${prefix}`,
      { method: "GET" },
    );
  } catch {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "Could not reach Core API." } },
      { status: 502 },
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "HIBP unavailable." } },
      { status: res.status === 400 ? 400 : 502 },
    );
  }

  const text = await res.text();
  return new NextResponse(text, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
