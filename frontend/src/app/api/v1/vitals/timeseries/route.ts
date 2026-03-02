/**
 * BFF Vitals Timeseries
 * GET /api/v1/vitals/timeseries?metric=heart_rate&period=7d
 *
 * Proxies to Core BE realtime health metrics.
 * MVP: returns 7-day mock data for chart rendering.
 */
import { NextRequest, NextResponse } from "next/server";

const CORE_API_URL = process.env.CORE_API_URL ?? "http://localhost:8000";

function generateMockVitals() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return {
      date: `${mm}-${dd}`,
      heartRate: 68 + Math.round(Math.random() * 18),
      systolic: 112 + Math.round(Math.random() * 16),
      diastolic: 72 + Math.round(Math.random() * 12),
    };
  });
}

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get("period") ?? "7d";

  // TODO: Replace with real Core BE fetch
  // const res = await fetch(`${CORE_API_URL}/v1/vitals/timeseries?period=${period}`, {
  //   next: { revalidate: 60 },
  // });

  void CORE_API_URL;
  void period;

  return NextResponse.json({
    status: "success",
    data: generateMockVitals(),
  });
}
