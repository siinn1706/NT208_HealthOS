/**
 * BFF — Single Pre-Visit Brief.
 *
 * GET    /api/v1/visit-briefs/{id}    → GET    /v1/visit-briefs/{id}
 * PATCH  /api/v1/visit-briefs/{id}    → PATCH  /v1/visit-briefs/{id}
 * DELETE /api/v1/visit-briefs/{id}    → DELETE /v1/visit-briefs/{id}   (archive)
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safe = encodeURIComponent(id);
  return coreProxy(req, `/v1/visit-briefs/${safe}`);
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safe = encodeURIComponent(id);
  return coreProxy(req, `/v1/visit-briefs/${safe}`, { method: "PATCH" });
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safe = encodeURIComponent(id);
  return coreProxy(req, `/v1/visit-briefs/${safe}`, { method: "DELETE" });
}
