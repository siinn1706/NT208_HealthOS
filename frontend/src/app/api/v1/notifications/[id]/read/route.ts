/**
 * BFF Notifications mark-read.
 *
 * POST /api/v1/notifications/{id}/read → POST /v1/notifications/{id}/read
 *
 * Forwards the auth cookie via `coreProxy`. If Core BE has not yet shipped
 * this endpoint we still return whatever it does (typically 404 / 405) and
 * the popover keeps an optimistic local "read" state, which is the safe
 * fallback for a non-critical surface.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safe = encodeURIComponent(id);
  return coreProxy(req, `/v1/notifications/${safe}/read`);
}
