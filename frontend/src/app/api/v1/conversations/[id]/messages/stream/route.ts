/**
 * BFF — AI conversation Server-Sent Events stream (B7 P6).
 *
 * POST /api/v1/conversations/{id}/messages/stream
 *   → POST /v1/conversations/{id}/messages/stream
 *
 * The Node.js runtime is required so the route handler can pipe the
 * upstream SSE body directly to the browser (the Edge runtime would
 * cap us at 25 s and it has subtler streaming behaviors). Cache /
 * buffering hints prevent CDNs and reverse proxies from breaking the
 * incremental delivery.
 */
import { NextRequest } from "next/server";
import { coreFetchStream } from "@/lib/core-api-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safe = encodeURIComponent(id);
  const upstream = await coreFetchStream(req, `/v1/conversations/${safe}/messages/stream`, {
    method: "POST",
  });
  const contentType =
    upstream.headers.get("content-type")
    ?? (upstream.ok ? "text/event-stream" : "application/json");

  const headers = new Headers();
  headers.set("Content-Type", contentType);

  if (upstream.ok) {
    headers.set("Cache-Control", "no-cache, no-transform");
    headers.set("X-Accel-Buffering", upstream.headers.get("x-accel-buffering") ?? "no");
    headers.set("Connection", "keep-alive");
  } else {
    headers.set("Cache-Control", "no-store");
    const retryAfter = upstream.headers.get("retry-after");
    if (retryAfter) headers.set("Retry-After", retryAfter);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
