/**
 * BFF — Attach a brief to an appointment.
 *
 * POST /api/v1/visit-briefs/{id}/attach
 *   → POST /v1/visit-briefs/{id}/attach
 *
 * Body: { appointment_id: uuid }
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  return coreProxy(req, `/v1/visit-briefs/${encodeURIComponent(id)}/attach`, {
    method: "POST",
  });
}
