import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";

const CORE_API_URL = process.env.CORE_API_URL ?? "http://localhost:8000";

async function getToken() {
  try {
    const store = await cookies();
    return store.get(SESSION_COOKIE_NAME)?.value ?? null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: { code: "AUTH_REQUIRED" } }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const metrics = searchParams.get("metrics");
  const period = searchParams.get("period") ?? "30d";

  if (!metrics) {
    return NextResponse.json({ error: { code: "MISSING_PARAM", message: "metrics required." } }, { status: 400 });
  }

  const metricList: string[] = metrics.split(",").map((m: string) => m.trim()).slice(0, 4);
  const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
  const days = daysMap[period] ?? 30;
  const now = new Date();
  const dateTo = now.toISOString().slice(0, 10);
  const dateFrom = new Date(now.getTime() - (days - 1) * 86400000).toISOString().slice(0, 10);

  // Try Core BE first — fallback only on 404
  try {
    const beRes = await fetch(
      `${CORE_API_URL}/v1/health-metrics/compare?metrics=${metrics}&period=${period}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (beRes.ok) return NextResponse.json(await beRes.json());
    // Fall through to client-side fallback for any non-ok response (404, 5xx, etc.)
  } catch { /* fall through to client-side */ }

  // Fallback: fetch each metric and align by date
  const dateSet = new Set<string>();
  const metricData: Record<string, Record<string, number>> = {};

  await Promise.all(
    metricList.map(async (metric: string) => {
      const res = await fetch(
        `${CORE_API_URL}/v1/health-metrics?metric_type=${metric}&date_from=${dateFrom}&date_to=${dateTo}&per_page=500`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      );
      if (!res.ok) return;
      const json = await res.json();
      const raw: unknown[] = (json as { data?: unknown[] }).data ?? [];
      const valid = raw.filter((r): r is { recorded_at: string; value: number } =>
        typeof r === "object" && r !== null && "recorded_at" in r && "value" in r && typeof r.recorded_at === "string" && typeof r.value === "number"
      );

      // Daily average per metric
      const dailyAvg = new Map<string, number[]>();
      for (const m of valid) {
        const day = m.recorded_at.slice(0, 10);
        dateSet.add(day);
        if (!dailyAvg.has(day)) dailyAvg.set(day, []);
        dailyAvg.get(day)!.push(m.value);
      }

      metricData[metric] = {};
      for (const [day, values] of dailyAvg) {
        metricData[metric][day] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
      }
    })
  );

  const sortedDates = Array.from(dateSet).sort();
  const result = sortedDates.map((date) => {
    const values: Record<string, number | null> = {};
    for (const metric of metricList) {
      values[metric] = metricData[metric]?.[date] ?? null;
    }
    return { date, values };
  });

  return NextResponse.json({ data: result });
}
