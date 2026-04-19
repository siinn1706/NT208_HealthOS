/**
 * BFF — Replace the question set for a draft brief.
 *
 * PATCH /api/v1/visit-briefs/{id}/questions
 *   → PATCH /v1/visit-briefs/{id}/questions
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  return coreProxy(req, `/v1/visit-briefs/${encodeURIComponent(id)}/questions`, {
    method: "PATCH",
  });
}
