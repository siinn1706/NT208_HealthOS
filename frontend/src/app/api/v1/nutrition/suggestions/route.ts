// BFF TODO: GET /api/v1/nutrition/suggestions
//   Trigger: Page load on /dashboard/meals
//   Response: { data: NutritionSuggestion[] }

import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/nutrition/suggestions");
}
