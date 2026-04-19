/**
 * BFF — Soft-delete a prescription asset (B7 P4).
 *
 * DELETE /api/v1/appointments/{id}/prescription/assets/{assetId}
 *   → DELETE /v1/appointments/{id}/prescription/assets/{assetId}
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ id: string; assetId: string }>;
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { id, assetId } = await ctx.params;
  const safeApp = encodeURIComponent(id);
  const safeAsset = encodeURIComponent(assetId);
  return coreProxy(
    req,
    `/v1/appointments/${safeApp}/prescription/assets/${safeAsset}`,
    { method: "DELETE" },
  );
}
