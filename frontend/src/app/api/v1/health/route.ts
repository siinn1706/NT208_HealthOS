/**
 * BFF health check — verifies BFF is running and optionally pings Core BE.
 * GET /api/v1/health
 */
import { NextResponse } from "next/server";
import { CORE_API_URL } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/bff-fetch-utils";

const CORE_HEALTH_TIMEOUT_MS = 2000;

export async function GET() {
  try {
    const res = await fetchWithTimeout(`${CORE_API_URL}/health/ready`, {
      method: "GET",
      cache: "no-store",
    }, CORE_HEALTH_TIMEOUT_MS);
    const payload = await res.json().catch(() => ({}));
    const body = {
      status: "ok",
      core_api: res.ok ? "reachable" : "unreachable",
      checks: typeof payload === "object" && payload !== null
        ? payload
        : { status: res.ok ? "ok" : "degraded" },
    };
    return NextResponse.json(body, { status: res.ok ? 200 : 503 });
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError"
      ? "timeout"
      : "unreachable";
    return NextResponse.json(
      { status: "error", core_api: reason, checks: { status: "degraded", reason } },
      { status: 503 },
    );
  }
}
