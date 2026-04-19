/**
 * BFF — single medication plan: detail, update metadata/schedule, archive.
 *
 *   GET    /api/v1/medications/{id}      → GET    /v1/medications/{id}
 *   PATCH  /api/v1/medications/{id}      → PATCH  /v1/medications/{id}
 *   DELETE /api/v1/medications/{id}      → DELETE /v1/medications/{id}
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safe = encodeURIComponent(id);
  return coreProxy(req, `/v1/medications/${safe}`);
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safe = encodeURIComponent(id);
  return coreProxy(req, `/v1/medications/${safe}`, { method: "PATCH" });
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safe = encodeURIComponent(id);
  return coreProxy(req, `/v1/medications/${safe}`, { method: "DELETE" });
}
