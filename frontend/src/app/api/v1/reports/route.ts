/**
 * BFF: GET /api/v1/reports?period=7d|30d|90d
 * Returns the health report for the requested period.
 * V1: proxy to Core BE GET /v1/reports?period=...
 */
import { NextRequest, NextResponse } from "next/server";
import { getHealthReport, listRecentReports } from "@/lib/reports-data";
import type { ReportPeriod } from "@/types/api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") ?? "7d") as ReportPeriod;
  const listOnly = searchParams.get("list") === "true";

  // TODO V1: validate session, forward to Core BE
  // const coreRes = await fetch(`${process.env.CORE_API_URL}/v1/reports?period=${period}`, {
  //   headers: { Authorization: req.headers.get("Authorization") ?? "" },
  // });
  // return coreRes.ok ? NextResponse.json(await coreRes.json()) : NextResponse.json({ error: "upstream" }, { status: coreRes.status });

  if (listOnly) {
    const reports = await listRecentReports();
    return NextResponse.json({ data: reports });
  }

  if (!["7d", "30d", "90d"].includes(period)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "period must be 7d, 30d, or 90d" } },
      { status: 400 }
    );
  }

  const report = await getHealthReport(period);
  return NextResponse.json({ data: report });
}
