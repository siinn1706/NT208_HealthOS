/**
 * BFF health check — verifies BFF is running and optionally pings Core BE.
 * GET /api/v1/health
 */
import { NextResponse } from "next/server";
import { CORE_API_URL } from "@/lib/env";

export async function GET() {
  try {
    const res = await fetch(`${CORE_API_URL}/health/ready`, {
      next: { revalidate: 0 },
    });
    const payload = await res.json().catch(() => ({}));
    const body = {
      status: "ok",
      core_api: res.ok ? "reachable" : "unreachable",
      checks: typeof payload === "object" && payload !== null
        ? payload
        : { status: res.ok ? "ok" : "degraded" },
    };
    return NextResponse.json(body, { status: res.ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ status: "error", core_api: "unreachable" }, { status: 503 });
  }
}
