/**
 * BFF — Prescription assets list + multipart upload (B7 P4).
 *
 * GET  /api/v1/appointments/{id}/prescription/assets
 * POST /api/v1/appointments/{id}/prescription/assets   (multipart/form-data; field "file")
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";
import { multipartProxy } from "@/lib/bff/multipart-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safe = encodeURIComponent(id);
  return coreProxy(req, `/v1/appointments/${safe}/prescription/assets`);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safe = encodeURIComponent(id);
  return multipartProxy(req, `/v1/appointments/${safe}/prescription/assets`);
}
