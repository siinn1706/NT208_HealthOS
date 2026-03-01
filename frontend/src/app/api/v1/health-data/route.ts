/**
 * BFF Health Data — aggregated dashboard payload.
 * GET /api/v1/health-data?range=30d
 *
 * BFF aggregates meals + health_metrics + recent alerts into one payload
 * so the dashboard makes only 1 request instead of 3.
 */
import { NextRequest, NextResponse } from "next/server";

const CORE_API_URL = process.env.CORE_API_URL ?? "http://localhost:8000";

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "30d";

  // TODO: auth check

  // Fan-out to Core BE (parallel)
  const [mealsRes, metricsRes] = await Promise.allSettled([
    fetch(`${CORE_API_URL}/v1/meals?per_page=5`, { next: { revalidate: 0 } }),
    fetch(`${CORE_API_URL}/v1/health-metrics?range=${range}`, { next: { revalidate: 0 } }),
  ]);

  const meals =
    mealsRes.status === "fulfilled" && mealsRes.value.ok
      ? await mealsRes.value.json()
      : { data: [] };

  const metrics =
    metricsRes.status === "fulfilled" && metricsRes.value.ok
      ? await metricsRes.value.json()
      : { data: [] };

  return NextResponse.json({
    data: {
      meals_summary: meals.data ?? [],
      metrics_summary: metrics.data ?? [],
      recent_alerts: [],
    },
  });
}

export async function POST(req: NextRequest) {
  // Log a meal
  const CORE = CORE_API_URL;
  const body = await req.formData();

  // TODO: auth check
  const res = await fetch(`${CORE}/v1/meals`, {
    method: "POST",
    body,
    // headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
