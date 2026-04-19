/**
 * BFF — PDF report download URL (B7 P10).
 *
 * GET /api/v1/reports/export-pdf/{requestId}/download
 *   → GET /v1/reports/export-pdf/{requestId}/download
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ requestId: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { requestId } = await ctx.params;
  const safe = encodeURIComponent(requestId);
  return coreProxy(req, `/v1/reports/export-pdf/${safe}/download`);
}
