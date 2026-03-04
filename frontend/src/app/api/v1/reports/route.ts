/**
 * BFF: GET /api/v1/reports?period=7d|30d|90d
 * Proxies to Core BE GET /v1/reports?period=...
 * Falls back to local mock when Core BE is unavailable.
 */
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getHealthReport, listRecentReports } from "@/lib/reports-data";
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
  const period = (searchParams.get("period") ?? "7d") as ReportPeriod;
  const listOnly = searchParams.get("list") === "true";

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
      const endpoint = listOnly
        ? `${CORE_API_URL}/v1/reports`
        : `${CORE_API_URL}/v1/reports?period=${period}`;
      const coreRes = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (coreRes.ok) return NextResponse.json(await coreRes.json());
      if (coreRes.status === 401 || coreRes.status === 403) {
        return NextResponse.json(
          { error: { code: "AUTH_REQUIRED", message: "Session expired. Please log in again." } },
          { status: coreRes.status }
        );
      }
    } catch {
      // Core BE offline — fall through to mock
    }
  }

  // Fallback mock
  if (listOnly) {
    const reports = await listRecentReports();
    return NextResponse.json({ data: reports });
  }
  const report = await getHealthReport(period);
  return NextResponse.json({ data: report });
}
