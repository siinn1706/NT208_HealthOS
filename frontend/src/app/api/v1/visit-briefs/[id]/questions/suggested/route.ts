/**
 * BFF — Curated question suggestions for a brief.
 *
 * GET /api/v1/visit-briefs/{id}/questions/suggested?visit_type=...&concern_category=...
 *   → GET /v1/visit-briefs/{id}/questions/suggested
 *
 * Query string is forwarded verbatim by `coreProxy`.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  return coreProxy(
    req,
    `/v1/visit-briefs/${encodeURIComponent(id)}/questions/suggested`,
  );
}
