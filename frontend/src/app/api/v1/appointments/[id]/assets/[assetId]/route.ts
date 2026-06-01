/**
 * BFF — Soft-delete an appointment asset.
 *
 * DELETE /api/v1/appointments/{id}/assets/{assetId}
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ id: string; assetId: string }>;
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { id, assetId } = await ctx.params;
  return coreProxy(
    req,
    `/v1/appointments/${encodeURIComponent(id)}/assets/${encodeURIComponent(assetId)}`,
    { method: "DELETE" },
  );
}
