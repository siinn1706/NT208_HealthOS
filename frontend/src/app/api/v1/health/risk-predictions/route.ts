// BFF TODO: GET /api/v1/health/risk-predictions
//   Trigger: Page load on /dashboard/risk
//   Request: { timeframe?: "current" }
//   Response: { data: RiskPredictionSummary }

// BFF TODO: POST /api/v1/health/risk-predictions/refresh
//   Trigger: User clicks refresh button
//   Response: { data: RiskPredictionSummary }

import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/health/risk-predictions");
}

export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/health/risk-predictions", { method: "POST" });
}
