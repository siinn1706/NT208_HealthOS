/**
 * BFF Auth — check username availability.
 * GET /api/v1/auth/check-username?username=xxx
 *
 * Proxies to Core BE: GET /v1/auth/check-username
 */
import { NextRequest, NextResponse } from "next/server";

import { CORE_API_URL } from "@/lib/env";

export async function GET(req: NextRequest) {
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
    res = await fetch(`${CORE_API_URL}/v1/auth/check-username?username=${encodeURIComponent(username)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
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
