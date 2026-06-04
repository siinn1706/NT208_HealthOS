import { NextRequest, NextResponse } from "next/server";
import { getBffAuthContext } from "@/lib/bff-auth-context";

import { CORE_API_URL } from "@/lib/env";

export async function GET(req: NextRequest) {
  const ctx = await getBffAuthContext(req);
  if (!ctx.token) {
    return NextResponse.json({ error: { code: "AUTH_REQUIRED" } }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const metric = searchParams.get("metric");
  const target = searchParams.get("target");
  const period = searchParams.get("period") ?? "30d";

  if (!metric || !target) {
    return NextResponse.json({ error: { code: "MISSING_PARAM" } }, { status: 400 });
  }

  const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
  const days = daysMap[period] ?? 30;
  const now = new Date();
  const dateTo = now.toISOString().slice(0, 10);
  const dateFrom = new Date(now.getTime() - (days - 1) * 86400000).toISOString().slice(0, 10);

  // Try BE endpoint first — fallback only on 404
  try {
    const beParams = new URLSearchParams({ metric, target, period });
    const beRes = await fetch(
      `${CORE_API_URL}/v1/goals/progress?${beParams}`,
      { headers: { Authorization: `Bearer ${ctx.token}` }, cache: "no-store" }
    );
    if (beRes.ok) return NextResponse.json(await beRes.json());
    // Fall through to client-side fallback for any non-ok response
  } catch { /* fall through */ }

  // Fallback: calculate from raw metrics
  const targetNum = parseFloat(target);
  const fallbackParams = new URLSearchParams({ metric_type: metric, date_from: dateFrom, date_to: dateTo, per_page: "500" });
  const res = await fetch(
    `${CORE_API_URL}/v1/health-metrics?${fallbackParams}`,
    { headers: { Authorization: `Bearer ${ctx.token}` }, cache: "no-store" }
  );

  if (!res.ok) {
    return NextResponse.json({ error: { code: "UPSTREAM_ERROR" } }, { status: res.status });
  }

  const json = await res.json();
  const raw: unknown[] = (json as { data?: unknown[] }).data ?? [];
  const valid = raw.filter((r): r is { recorded_at: string; value: number } =>
    typeof r === "object" && r !== null && "recorded_at" in r && "value" in r && typeof r.recorded_at === "string" && typeof r.value === "number"
  );

  // Sum per day
  const dailySum = new Map<string, number>();
  for (const m of valid) {
    const day = m.recorded_at.slice(0, 10);
    dailySum.set(day, (dailySum.get(day) ?? 0) + m.value);
  }

  const result = Array.from(dailySum.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date,
      value: Math.round(value * 100) / 100,
      target: targetNum,
      progress_percent: Math.round((value / targetNum * 100) * 10) / 10,
    }));

  return NextResponse.json({ data: result });
}
