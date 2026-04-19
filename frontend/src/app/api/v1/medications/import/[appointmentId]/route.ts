/**
 * BFF — import medications from an appointment's prescription.
 *
 *   POST /api/v1/medications/import/{appointmentId}
 *     body: { default_dose_times?: string[], default_repeat?: string }
 *     → POST /v1/medications/import/{appointmentId}
 *
 * Idempotent on Core via `dedupe_key`. Re-runs return existing plans in the
 * `skipped` list rather than creating duplicates.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ appointmentId: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { appointmentId } = await ctx.params;
  const safe = encodeURIComponent(appointmentId);
  return coreProxy(req, `/v1/medications/import/${safe}`, { method: "POST" });
}
