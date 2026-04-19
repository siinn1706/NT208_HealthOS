/**
 * BFF — Account data export status poll (B7 P8).
 *
 * GET /api/v1/users/me/export/{requestId} → GET /v1/users/me/export/{requestId}
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ requestId: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { requestId } = await ctx.params;
  const safe = encodeURIComponent(requestId);
  return coreProxy(req, `/v1/users/me/export/${safe}`);
}
