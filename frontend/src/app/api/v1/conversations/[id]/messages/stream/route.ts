/**
 * BFF — AI conversation Server-Sent Events stream.
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

function copySetCookieHeaders(source: Headers, target: Headers): void {
  const getSetCookie = (source as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const cookies =
    typeof getSetCookie === "function"
      ? getSetCookie.call(source)
      : source.get("set-cookie")
        ? [source.get("set-cookie") as string]
        : [];

  for (const cookie of cookies) {
    target.append("Set-Cookie", cookie);
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safe = encodeURIComponent(id);
  const upstream = await coreFetchStream(req, `/v1/conversations/${safe}/messages/stream`, {
    method: "POST",
  });

  // Guard rejection returns JSON 403 — short-circuit before applying SSE headers.
  if (!upstream.ok && upstream.headers.get("content-type")?.startsWith("application/json")) {
    return upstream;
  }

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
    Connection: "keep-alive",
  });
  const requestId = upstream.headers.get("X-Request-ID");
  if (requestId) headers.set("X-Request-ID", requestId);
  copySetCookieHeaders(upstream.headers, headers);

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
