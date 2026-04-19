/**
 * BFF — adherence aggregate for a medication plan over a window.
 *
 *   GET /api/v1/medications/{id}/adherence?period=7d|30d|90d
 *     → GET /v1/medications/{id}/adherence
 *
 * Fetched on-demand when the user toggles the period tab on detail page.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safe = encodeURIComponent(id);
  return coreProxy(req, `/v1/medications/${safe}/adherence`);
}
