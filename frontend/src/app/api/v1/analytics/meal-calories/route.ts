import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";
import { cacheGet, cacheSet } from "@/lib/redis-cache";

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
    const beRes = await fetch(
      `${CORE_API_URL}/v1/meals/calories-summary?date_from=${from}&date_to=${to}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
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
  const mealsRes = await fetch(
    `${CORE_API_URL}/v1/meals?date_from=${from}&date_to=${to}&per_page=500`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );

  if (!mealsRes.ok) {
    return NextResponse.json({ error: { code: "UPSTREAM_ERROR" } }, { status: 503 });
  }

  const mealsJson = await mealsRes.json();
  const meals: Array<{ recorded_at?: string; calories?: number }> = mealsJson?.data ?? [];

  const byDate = new Map<string, number>();
  for (const meal of meals) {
    const day = meal.recorded_at?.split("T")[0];
    if (!day) continue;
    byDate.set(day, (byDate.get(day) ?? 0) + (meal.calories ?? 0));
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
