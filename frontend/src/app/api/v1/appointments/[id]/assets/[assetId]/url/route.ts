/**
 * BFF — Mint a short-lived signed download URL for an appointment asset.
 *
 * GET /api/v1/appointments/{id}/assets/{assetId}/url
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ id: string; assetId: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id, assetId } = await ctx.params;
  return coreProxy(
    req,
    `/v1/appointments/${encodeURIComponent(id)}/assets/${encodeURIComponent(assetId)}/url`,
  );
}
