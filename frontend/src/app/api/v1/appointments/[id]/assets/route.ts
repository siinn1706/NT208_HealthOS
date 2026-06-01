/**
 * BFF — Appointment assets list + multipart upload.
 *
 * GET  /api/v1/appointments/{id}/assets
 * POST /api/v1/appointments/{id}/assets
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";
import { multipartProxy } from "@/lib/bff/multipart-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  return coreProxy(req, `/v1/appointments/${encodeURIComponent(id)}/assets`);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  return multipartProxy(req, `/v1/appointments/${encodeURIComponent(id)}/assets`);
}
