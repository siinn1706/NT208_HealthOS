/**
 * BFF: GET /api/v1/reports/trends?metric=heart_rate&period=30d
 * Returns trend analysis for the specified metric.
 */
import { NextRequest, NextResponse } from "next/server";
import { getTrendAnalysis } from "@/lib/reports-data";
import type { ReportPeriod } from "@/types/api";

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

  // TODO V1: proxy to Core BE
  const analysis = await getTrendAnalysis(metric, period);
  return NextResponse.json({ data: analysis });
}
