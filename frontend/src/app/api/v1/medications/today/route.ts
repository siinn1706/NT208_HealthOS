/**
 * BFF — today's medication doses across active plans.
 *
 *   GET /api/v1/medications/today?tzid=Asia/Ho_Chi_Minh
 *     → GET /v1/medications/today
 *
 * Drives `<TodayDosesPanel />` on `/dashboard` and the Hub.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/medications/today");
}
