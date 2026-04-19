/**
 * BFF — Detach a brief from an appointment.
 *
 * DELETE /api/v1/visit-briefs/{id}/attach/{linkId}
 *   → DELETE /v1/visit-briefs/{id}/attach/{linkId}
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ id: string; linkId: string }>;
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { id, linkId } = await ctx.params;
  return coreProxy(
    req,
    `/v1/visit-briefs/${encodeURIComponent(id)}/attach/${encodeURIComponent(linkId)}`,
    { method: "DELETE" },
  );
}
