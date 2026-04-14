/**
 * BFF health check — verifies BFF is running and optionally pings Core BE.
 * GET /api/v1/health
 */
import { NextResponse } from "next/server";
import { CORE_API_URL } from "@/lib/env";

export async function GET() {
  let coreApi: "reachable" | "unreachable" = "unreachable";

  try {
    const res = await fetch(`${CORE_API_URL}/health`, {
      next: { revalidate: 0 },
    });
    if (res.ok) coreApi = "reachable";
  } catch {
    coreApi = "unreachable";
  }

  return NextResponse.json({ status: "ok", core_api: coreApi });
}
