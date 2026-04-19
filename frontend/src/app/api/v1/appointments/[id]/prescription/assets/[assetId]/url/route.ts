/**
 * BFF — Mint a short-lived signed download URL for a prescription asset.
 *
 * GET /api/v1/appointments/{id}/prescription/assets/{assetId}/url
 *   → GET /v1/appointments/{id}/prescription/assets/{assetId}/url
 *
 * The signed URL is for the upstream MinIO/S3 object directly; the FE opens it
 * in a new tab/iframe. Each call mints a fresh URL so there is no useful
 * caching to do here.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ id: string; assetId: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id, assetId } = await ctx.params;
  const safeApp = encodeURIComponent(id);
  const safeAsset = encodeURIComponent(assetId);
  return coreProxy(
    req,
    `/v1/appointments/${safeApp}/prescription/assets/${safeAsset}/url`,
  );
}
