import { NextRequest, NextResponse } from "next/server";
import { getBffAuthContext } from "@/lib/bff-auth-context";

import { CORE_API_URL } from "@/lib/env";

export async function GET(req: NextRequest) {
  const ctx = await getBffAuthContext(req);
  if (!ctx.token) return NextResponse.json({ error: { code: "AUTH_REQUIRED" } }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const metric = searchParams.get("metric");
  const period = searchParams.get("period") ?? "30d";

  if (!metric) return NextResponse.json({ error: { code: "MISSING_PARAM" } }, { status: 400 });

  const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
  const days = daysMap[period] ?? 30;

  // Try BE endpoint first — fallback only on 404
  try {
    const beParams = new URLSearchParams({ metric, period });
    const beRes = await fetch(
      `${CORE_API_URL}/v1/health-metrics/compare-periods?${beParams}`,
      { headers: { Authorization: `Bearer ${ctx.token}` }, cache: "no-store" }
    );
    if (beRes.ok) return NextResponse.json(await beRes.json());
    // Fall through to client-side fallback for any non-ok response
  } catch { /* fall through */ }

  // Fallback: calculate both periods from raw metrics
  const now = new Date();
  const currentTo = now.toISOString().slice(0, 10);
  const currentFrom = new Date(now.getTime() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const prevTo = new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10);
  const prevFrom = new Date(now.getTime() - (2 * days - 1) * 86400000).toISOString().slice(0, 10);

  const token = ctx.token;
  async function fetchPeriod(from: string, to: string) {
    const params = new URLSearchParams({ metric_type: metric!, date_from: from, date_to: to, per_page: "500" });
    const res = await fetch(
      `${CORE_API_URL}/v1/health-metrics?${params}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const raw: unknown[] = (json as { data?: unknown[] }).data ?? [];
    return raw.filter((r): r is { value: number } =>
      typeof r === "object" && r !== null && "value" in r && typeof r.value === "number"
    );
  }

  const [currentRaw, prevRaw] = await Promise.all([
    fetchPeriod(currentFrom, currentTo),
    fetchPeriod(prevFrom, prevTo),
  ]);

  function stats(data: Array<{ value: number }>) {
    if (!data.length) return { avg: 0, min: 0, max: 0, total: 0, count: 0 };
    const vals = data.map((d) => d.value);
    return {
      avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
      min: Math.round(Math.min(...vals) * 100) / 100,
      max: Math.round(Math.max(...vals) * 100) / 100,
      total: Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100,
      count: vals.length,
    };
  }

  const currentStats = stats(currentRaw);
  const prevStats = stats(prevRaw);
  const changePct = prevStats.avg === 0 ? 0 :
    Math.round((currentStats.avg - prevStats.avg) / prevStats.avg * 1000) / 10;
  const trend = Math.abs(changePct) < 3 ? "stable" : changePct > 0 ? "improving" : "declining";

  return NextResponse.json({
    data: {
      current: { ...currentStats, period: "current" as const, trend },
      previous: { ...prevStats, period: "previous" as const, trend },
      change_percent: changePct,
    },
  });
}
