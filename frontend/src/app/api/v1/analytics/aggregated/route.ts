import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";
import { cacheGet, cacheSet, cacheKey } from "@/lib/redis-cache";
import { CORE_API_URL } from "@/lib/env";

async function getToken(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(SESSION_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { searchParams } = req.nextUrl;
  const metricType = searchParams.get("metric_type");
  const period = (searchParams.get("period") ?? "daily") as "daily" | "weekly" | "monthly";
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  if (!metricType) {
    return NextResponse.json(
      { error: { code: "MISSING_PARAM", message: "metric_type is required." } },
      { status: 400 }
    );
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "date_from must be before date_to." } },
      { status: 400 }
    );
  }

  // Try Redis cache first
  const userId = "user"; // token-based auth; cache key is broad enough
  const ck = cacheKey(userId, "aggregated", { metricType, period, dateFrom: dateFrom ?? "", dateTo: dateTo ?? "" });
  const cached = await cacheGet(ck);
  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }

  // Try Core BE aggregation endpoint first
  const beParams = new URLSearchParams({ metric_type: metricType, period });
  if (dateFrom) beParams.set("date_from", dateFrom);
  if (dateTo) beParams.set("date_to", dateTo);

  try {
    const beRes = await fetch(
      `${CORE_API_URL}/v1/health-metrics/aggregated?${beParams}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );

    if (beRes.ok) {
      const data = await beRes.json();
      await cacheSet(ck, JSON.stringify(data), 300);
      return NextResponse.json(data);
    }

    // Fallback: aggregate client-side when BE endpoint doesn't exist (404) or returns an error (5xx).
    // This makes the BFF resilient to BE-side data issues (e.g. empty user data for this metric).
    if (beRes.status === 404 || beRes.status >= 500) {
      const result = await aggregateClientSide(token, metricType, period, dateFrom, dateTo);
      await cacheSet(ck, JSON.stringify(result), 300);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: `Core BE returned ${beRes.status}.` } },
      { status: beRes.status }
    );
  } catch {
    return NextResponse.json(
      { error: { code: "UPSTREAM_UNAVAILABLE", message: "Core service unavailable." } },
      { status: 503 }
    );
  }
}

async function aggregateClientSide(
  token: string,
  metricType: string,
  period: "daily" | "weekly" | "monthly",
  dateFrom: string | null,
  dateTo: string | null
) {
  // Fetch raw metrics for the range
  const rangeMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
  const days = rangeMap[period] ?? 30;
  const now = new Date();
  const to = dateTo ?? now.toISOString().slice(0, 10);
  const from = dateFrom ?? new Date(now.getTime() - (days - 1) * 86400000).toISOString().slice(0, 10);

  const rawMetrics: Array<{ recorded_at: string; value: number }> = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `${CORE_API_URL}/v1/health-metrics?metric_type=${metricType}&date_from=${from}&date_to=${to}&per_page=500&page=${page}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (!res.ok) {
      return { error: { code: "UPSTREAM_ERROR", message: "Failed to fetch raw metrics." } };
    }
    const json = await res.json();
    const raw: unknown[] = (json as { data?: unknown[] }).data ?? [];
    const data = raw.filter((r): r is { recorded_at: string; value: number } =>
      typeof r === "object" && r !== null && "recorded_at" in r && "value" in r && typeof r.recorded_at === "string" && typeof r.value === "number"
    );
    rawMetrics.push(...data);
    const total = (json as { meta?: { total?: number } }).meta?.total ?? 0;
    if (rawMetrics.length >= total || data.length === 0) break;
    page++;
  }

  // Group by period
  const groups = new Map<string, number[]>();
  for (const m of rawMetrics) {
    const d = new Date(m.recorded_at);
    let key: string;
    if (period === "weekly") {
      // ISO week: start of week (Monday)
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d.getFullYear(), d.getMonth(), diff);
      key = weekStart.toISOString().slice(0, 10);
    } else if (period === "monthly") {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    } else {
      key = m.recorded_at.slice(0, 10);
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m.value);
  }

  const aggregated = Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({
      date,
      avg_value: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
      min_value: Math.round(Math.min(...values) * 100) / 100,
      max_value: Math.round(Math.max(...values) * 100) / 100,
      count: values.length,
    }));

  return { data: aggregated };
}
