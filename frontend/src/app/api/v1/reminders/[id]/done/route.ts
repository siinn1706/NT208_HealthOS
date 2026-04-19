/**
 * BFF — Mark a reminder occurrence done (B7 P5).
 *
 * POST /api/v1/reminders/{id}/done → POST /v1/reminders/{id}/done
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safe = encodeURIComponent(id);
  return coreProxy(req, `/v1/reminders/${safe}/done`, { method: "POST" });
}
