import { NextRequest, NextResponse } from "next/server";
import { getBffAuthContext } from "@/lib/bff-auth-context";

import { CORE_API_URL } from "@/lib/env";

export async function GET(req: NextRequest) {
  const ctx = await getBffAuthContext(req);
  if (!ctx.token) {
    return NextResponse.json({ error: { code: "AUTH_REQUIRED" } }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const days = parseInt(searchParams.get("days") ?? "7", 10);
  const target = parseFloat(searchParams.get("target") ?? "2000");

  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now.getTime() - (days - 1) * 86400000).toISOString().slice(0, 10);

  // Try BE endpoint first
  try {
    const beParams = new URLSearchParams({ date_from: from, date_to: to });
    const beRes = await fetch(
      `${CORE_API_URL}/v1/meals/calories-summary?${beParams}`,
      { headers: { Authorization: `Bearer ${ctx.token}` }, cache: "no-store" }
    );
    if (beRes.ok) {
      const json = await beRes.json();
      const rows: Array<{ date: string; total_calories: number }> = json?.data ?? [];

      const result = rows.map((r) => ({
        date: r.date,
        value: r.total_calories,
        target,
        progress_percent:
          target > 0 ? Math.round((r.total_calories / target) * 1000) / 10 : null,
      }));

      return NextResponse.json({ data: result });
    }
  } catch {
    // fall through to client-side
  }

  // Fallback: fetch raw meals and aggregate
  const mealsParams = new URLSearchParams({ date_from: from, date_to: to, per_page: "500" });
  const mealsRes = await fetch(
    `${CORE_API_URL}/v1/meals?${mealsParams}`,
    { headers: { Authorization: `Bearer ${ctx.token}` }, cache: "no-store" }
  );

  if (!mealsRes.ok) {
    return NextResponse.json({ error: { code: "UPSTREAM_ERROR" } }, { status: 503 });
  }

  const mealsJson = await mealsRes.json();
  const meals: Array<{
    logged_at?: string;
    nutrition_result?: { calories?: number };
  }> = mealsJson?.data ?? [];

  const byDate = new Map<string, number>();
  for (const meal of meals) {
    const day = meal.logged_at?.split("T")[0];
    if (!day) continue;
    const cal = meal.nutrition_result?.calories ?? 0;
    byDate.set(day, (byDate.get(day) ?? 0) + cal);
  }

  const result = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date,
      value,
      target,
      progress_percent: target > 0 ? Math.round((value / target) * 1000) / 10 : null,
    }));

  return NextResponse.json({ data: result });
}
