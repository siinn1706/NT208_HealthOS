/**
 * BFF — resume a paused medication plan (re-activate child reminders,
 * top up occurrence materialization for the next horizon).
 *
 *   POST /api/v1/medications/{id}/resume → POST /v1/medications/{id}/resume
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safe = encodeURIComponent(id);
  return coreProxy(req, `/v1/medications/${safe}/resume`, { method: "POST" });
}
