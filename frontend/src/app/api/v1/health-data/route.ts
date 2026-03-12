/**
 * BFF Health Data — aggregated dashboard payload.
 * GET /api/v1/health-data?range=30d
 *
 * BFF aggregates meals + health_metrics + recent alerts into one payload
 * so the dashboard makes only 1 request instead of 3.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";

const CORE_API_URL = process.env.CORE_API_URL ?? "http://localhost:8000";

async function getAccessToken(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(SESSION_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const rangeMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
  const days = rangeMap[range] ?? 30;
  const now = new Date();
  const dateTo = now.toISOString().slice(0, 10);
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  const dateFrom = from.toISOString().slice(0, 10);

  let mealsData: unknown = { data: [] };
  let metricsData: unknown = { data: [] };

  try {
    const [mealsRes, metricsRes] = await Promise.all([
      fetch(`${CORE_API_URL}/v1/meals?per_page=5`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
      fetch(`${CORE_API_URL}/v1/health-metrics?date_from=${dateFrom}&date_to=${dateTo}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
    ]);

    if (!mealsRes.ok) {
      const err = await mealsRes.json().catch(() => ({ error: { code: "UPSTREAM_ERROR", message: "Failed to fetch meals." } }));
      return NextResponse.json(err, { status: mealsRes.status });
    }
    if (!metricsRes.ok) {
      const err = await metricsRes.json().catch(() => ({ error: { code: "UPSTREAM_ERROR", message: "Failed to fetch health metrics." } }));
      return NextResponse.json(err, { status: metricsRes.status });
    }

    mealsData = await mealsRes.json();
    metricsData = await metricsRes.json();
  } catch {
    return NextResponse.json(
      { error: { code: "UPSTREAM_UNAVAILABLE", message: "Core service is temporarily unavailable." } },
      { status: 503 }
    );
  }

  return NextResponse.json({
    data: {
      meals_summary: (mealsData as { data?: unknown[] }).data ?? [],
      metrics_summary: (metricsData as { data?: unknown[] }).data ?? [],
      recent_alerts: [],
    },
  });
}

export async function POST(req: NextRequest) {
  // Log a meal
  const CORE = CORE_API_URL;
  const body = await req.formData();
  const token = await getAccessToken();

  if (!token) {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const res = await fetch(`${CORE}/v1/meals`, {
    method: "POST",
    body,
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
