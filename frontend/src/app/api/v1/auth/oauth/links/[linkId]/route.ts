/**
 * BFF — OAuth Linked Accounts (B7 P3).
 *
 * DELETE /api/v1/auth/oauth/links/{linkId} → DELETE /v1/auth/oauth/links/{linkId}
 *   Unlink a provider; refused with 409 if it is the last sign-in method.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ linkId: string }>;
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { linkId } = await ctx.params;
  const safe = encodeURIComponent(linkId);
  return coreProxy(req, `/v1/auth/oauth/links/${safe}`, { method: "DELETE" });
}
