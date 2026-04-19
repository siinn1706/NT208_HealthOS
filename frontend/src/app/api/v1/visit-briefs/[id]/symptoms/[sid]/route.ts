/**
 * BFF — Edit / delete a single symptom on a visit brief.
 *
 * PATCH  /api/v1/visit-briefs/{id}/symptoms/{sid}
 *   → PATCH  /v1/visit-briefs/{id}/symptoms/{sid}
 *
 * DELETE /api/v1/visit-briefs/{id}/symptoms/{sid}
 *   → DELETE /v1/visit-briefs/{id}/symptoms/{sid}
 *
 * Both routes recompute triage server-side and write a fresh row to
 * `triage_outcomes`.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ id: string; sid: string }>;
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id, sid } = await ctx.params;
  return coreProxy(
    req,
    `/v1/visit-briefs/${encodeURIComponent(id)}/symptoms/${encodeURIComponent(sid)}`,
    { method: "PATCH" },
  );
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { id, sid } = await ctx.params;
  return coreProxy(
    req,
    `/v1/visit-briefs/${encodeURIComponent(id)}/symptoms/${encodeURIComponent(sid)}`,
    { method: "DELETE" },
  );
}
