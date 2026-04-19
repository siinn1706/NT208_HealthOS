/**
 * BFF — Triage outcome history (audit replay).
 *
 * GET /api/v1/visit-briefs/{id}/triage-history
 *   → GET /v1/visit-briefs/{id}/triage-history
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  return coreProxy(req, `/v1/visit-briefs/${encodeURIComponent(id)}/triage-history`);
}
