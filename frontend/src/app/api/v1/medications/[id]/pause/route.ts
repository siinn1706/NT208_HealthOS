/**
 * BFF — pause a medication plan (deactivates child reminders, cancels
 * pending occurrences). Separate from PATCH so callers don't accidentally
 * silence notifications by editing metadata.
 *
 *   POST /api/v1/medications/{id}/pause → POST /v1/medications/{id}/pause
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safe = encodeURIComponent(id);
  return coreProxy(req, `/v1/medications/${safe}/pause`, { method: "POST" });
}
