/**
 * BFF — log a refill event for a medication plan.
 *
 *   POST /api/v1/medications/{id}/refill
 *     body: { supply_units: number, refilled_at?: string }
 *     → POST /v1/medications/{id}/refill
 *
 * Server recomputes `next_refill_estimated_at` from supply / dose-load.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safe = encodeURIComponent(id);
  return coreProxy(req, `/v1/medications/${safe}/refill`, { method: "POST" });
}
