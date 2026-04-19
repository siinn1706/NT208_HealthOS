/**
 * BFF — Finalize a draft brief.
 *
 * POST /api/v1/visit-briefs/{id}/finalize
 *   → POST /v1/visit-briefs/{id}/finalize
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  return coreProxy(req, `/v1/visit-briefs/${encodeURIComponent(id)}/finalize`, {
    method: "POST",
  });
}
