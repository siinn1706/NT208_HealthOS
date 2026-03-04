/**
 * BFF: GET /api/v1/reports/trends?metric=heart_rate&period=30d
 * Proxies to Core BE GET /v1/health-metrics?metric=...&range=...
 * Falls back to local mock trend analysis.
 */
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getTrendAnalysis } from "@/lib/reports-data";
import type { ReportPeriod } from "@/types/api";

const CORE_API_URL = process.env.CORE_API_URL ?? "http://localhost:8000";

async function getToken(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get("core_access_token")?.value ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const metric = searchParams.get("metric") ?? "heart_rate";
  const period = (searchParams.get("period") ?? "30d") as ReportPeriod;

  if (!["7d", "30d", "90d"].includes(period)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "period must be 7d, 30d, or 90d" } },
      { status: 400 }
    );
  }

  const token = await getToken();

  // Try Core BE first
  if (token) {
    try {
      const coreRes = await fetch(
        `${CORE_API_URL}/v1/health-metrics?metric=${metric}&range=${period}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      );
      if (coreRes.ok) return NextResponse.json(await coreRes.json());
    } catch {
      // Core BE offline — fall through to mock
    }
  }

  const analysis = await getTrendAnalysis(metric, period);
  return NextResponse.json({ data: analysis });
}
