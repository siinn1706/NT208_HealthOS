/**
 * BFF Dashboard Summary — aggregated overview payload.
 * GET /api/v1/dashboard/summary
 *
 * Fans out to Core BE vitals, meals & alerts. Falls back to mock data
 * when Core BE is unavailable (local dev / CI).
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const CORE_API_URL = process.env.CORE_API_URL ?? "http://localhost:8000";

async function getToken(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get("core_access_token")?.value ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const token = await getToken();
  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  // Attempt fan-out to Core BE endpoints in parallel
  const [mealsRes, metricsRes] = await Promise.allSettled([
    fetch(`${CORE_API_URL}/v1/meals?per_page=1`, {
      headers: authHeader,
      cache: "no-store",
    }),
    fetch(`${CORE_API_URL}/v1/health-metrics?range=1d`, {
      headers: authHeader,
      cache: "no-store",
    }),
  ]);

  const mealsOk = mealsRes.status === "fulfilled" && mealsRes.value.ok;
  const metricsOk = metricsRes.status === "fulfilled" && metricsRes.value.ok;

  // Retrieve user name from session endpoint if available
  let userName = "Người dùng";
  if (token) {
    try {
      const meRes = await fetch(`${CORE_API_URL}/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (meRes.ok) {
        const me = await meRes.json();
        if (me?.data?.display_name) userName = me.data.display_name;
      }
    } catch {
      // ignore
    }
  }

  const mealsData = mealsOk ? await mealsRes.value.json() : null;
  const metricsData = metricsOk ? await metricsRes.value.json() : null;

  // Build alerts from live data when available
  const alerts: { id: string; type: string; message: string }[] = [];
  if (!mealsOk || (mealsData?.data ?? []).length === 0) {
    alerts.push({
      id: "alert-no-meal",
      type: "info",
      message: "Bạn chưa ghi nhật ký bữa ăn hôm nay.",
    });
  }

  // KPIs — use real metrics when available, otherwise static illustrative values
  const latestMetric = (metricsData?.data ?? [])[0];
  const kpis = {
    caloriesBurned: { current: latestMetric?.calories_burned ?? 1240, target: 2000 },
    sleepScore: { current: latestMetric?.sleep_score ?? 78, target: 100 },
    heartRate: { current: latestMetric?.heart_rate ?? 74, target: 100 },
    steps: { current: latestMetric?.steps ?? 6800, target: 10000 },
  };

  const payload = {
    status: "success",
    data: {
      user_name: userName,
      alerts,
      kpis,
      goals: [
        { id: "g-1", key: "water", current: 1500, target: 2000, unit: "ml" },
        { id: "g-2", key: "steps", current: kpis.steps.current, target: 10000, unit: "bước" },
        { id: "g-3", key: "calories", current: kpis.caloriesBurned.current, target: 2000, unit: "kcal" },
      ],
      ai_insight: {
        text: "Dựa trên nhịp tim và số bước hôm nay, bạn nên đi bộ thêm khoảng 20 phút để đạt mục tiêu. Uống thêm 500ml nước để cải thiện hiệu suất vận động.",
        category: "activity",
      },
    },
  };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
