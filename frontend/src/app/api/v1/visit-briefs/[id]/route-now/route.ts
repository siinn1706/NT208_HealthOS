/**
 * BFF — On-demand triage recompute.
 *
 * POST /api/v1/visit-briefs/{id}/route-now
 *   → POST /v1/visit-briefs/{id}/route-now
 *
 * Returns the freshly-computed `TriageOutcomeDTO`. Idempotent: every call
 * writes a new audit row but the FE only ever shows the latest one.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  return coreProxy(req, `/v1/visit-briefs/${encodeURIComponent(id)}/route-now`, {
    method: "POST",
  });
}
