/**
 * BFF — Add a symptom to a visit brief (recomputes triage server-side).
 *
 * POST /api/v1/visit-briefs/{id}/symptoms → POST /v1/visit-briefs/{id}/symptoms
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safe = encodeURIComponent(id);
  return coreProxy(req, `/v1/visit-briefs/${safe}/symptoms`, { method: "POST" });
}
