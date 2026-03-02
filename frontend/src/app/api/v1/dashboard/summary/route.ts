/**
 * BFF Dashboard Summary — aggregated overview payload.
 * GET /api/v1/dashboard/summary
 *
 * Returns: user KPIs, active alerts, today's greeting data.
 * In production: fan-out to Core BE vitals, meals & alerts endpoints.
 * For MVP: returns mock data while Core BE endpoints are stabilised.
 */
import { NextResponse } from "next/server";

const CORE_API_URL = process.env.CORE_API_URL ?? "http://localhost:8000";

export async function GET() {
  // TODO: Replace with real Core BE fan-out + auth check
  // const [kpisRes, alertsRes] = await Promise.allSettled([
  //   fetch(`${CORE_API_URL}/v1/health/kpi`, { next: { revalidate: 30 } }),
  //   fetch(`${CORE_API_URL}/v1/alerts/active`, { next: { revalidate: 0 } }),
  // ]);

  void CORE_API_URL; // suppress unused warning during MVP

  // --- MOCK ---
  const payload = {
    status: "success",
    data: {
      user_name: "Nguyễn Văn A",
      alerts: [
        {
          id: "alert-1",
          type: "warning",
          message: "Nhịp tim của bạn cao hơn mức bình thường trong 10 phút vừa qua.",
        },
        {
          id: "alert-2",
          type: "info",
          message: "Bạn chưa ghi nhật ký bữa trưa hôm nay.",
        },
      ],
      kpis: {
        caloriesBurned: { current: 1240, target: 2000 },
        sleepScore: { current: 78, target: 100 },
        heartRate: { current: 74, target: 100 },
        steps: { current: 6800, target: 10000 },
      },
      goals: [
        { id: "g-1", key: "water", current: 1500, target: 2000, unit: "ml" },
        { id: "g-2", key: "steps", current: 6800, target: 10000, unit: "bước" },
        { id: "g-3", key: "calories", current: 1240, target: 2000, unit: "kcal" },
      ],
      ai_insight: {
        text: "Dựa trên nhịp tim và số bước hôm nay, bạn nên đi bộ thêm khoảng 20 phút để đạt mục tiêu. Uống thêm 500ml nước để cải thiện hiệu suất.",
        category: "activity",
      },
    },
  };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
