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
 *
 * Rate limiting: token bucket (10 req / 60 s burst of 5) per user principal.
 * Concurrency cap: at most 1 concurrent stream per user to prevent a
 * single user from stacking multiple long-lived GPU allocations.
 */
import { NextRequest, NextResponse } from "next/server";
import { getBffAuthContext } from "@/lib/bff-auth-context";
import { coreFetchStream } from "@/lib/core-api-proxy";
import { takeToken } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// ── Concurrency cap ──────────────────────────────────────────────────────────
// Module-level set tracking principals that currently hold an active stream.
// In-process only; acceptable for per-worker approximation.
const activeStreams = new Set<string>();

// ── Rate-limit config ────────────────────────────────────────────────────────
const STREAM_RATE_LIMIT = { burst: 5, refillIntervalMs: 6_000 } as const;
// burst 5, refill 1 token per 6 s → 10 req / 60 s steady-state

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  // Resolve principal for rate-limiting and concurrency tracking.
  // Captured as a const before any IIFE so closures (stream cleanup) bind correctly.
  const authCtx = await getBffAuthContext(req);
  const principal = authCtx.principal;

  if (!authCtx.token) {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "Authentication required." } },
      { status: 401 },
    );
  }

  if (principal) {
    // 1. Rate-limit check.
    const rl = takeToken(`chat-stream:${principal}`, STREAM_RATE_LIMIT);
    if (!rl.ok) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later." } },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
        },
      );
    }

    // 2. Concurrency cap: reject if this user already has an active stream.
    if (activeStreams.has(principal)) {
      return NextResponse.json(
        { error: { code: "STREAM_ALREADY_ACTIVE", message: "A stream is already in progress for this session." } },
        { status: 429 },
      );
    }

    activeStreams.add(principal);
  }

  const safe = encodeURIComponent(id);

  let upstream: Response;
  try {
    upstream = await coreFetchStream(req, `/v1/conversations/${safe}/messages/stream`, {
      method: "POST",
    });
  } catch (err) {
    // Ensure concurrency slot is released on fetch failure.
    if (principal) activeStreams.delete(principal);
    throw err;
  }

  // Guard rejection returns JSON 403 — short-circuit before applying SSE headers.
  if (!upstream.ok && upstream.headers.get("content-type")?.startsWith("application/json")) {
    if (principal) activeStreams.delete(principal);
    return upstream;
  }

  const responseHeaders = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
    Connection: "keep-alive",
  });
  const requestId = upstream.headers.get("X-Request-ID");
  if (requestId) responseHeaders.set("X-Request-ID", requestId);
  copySetCookieHeaders(upstream.headers, responseHeaders);

  // Wrap the upstream body in a TransformStream so we can release the
  // concurrency slot when the stream closes (either normally or on error).
  let body: ReadableStream<Uint8Array> | null = upstream.body;
  if (principal && body) {
    const transform = new TransformStream<Uint8Array, Uint8Array>();
    const writer = transform.writable.getWriter();

    // Pipe upstream → transform, then release the concurrency slot.
    (async () => {
      const reader = (body as ReadableStream<Uint8Array>).getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
        await writer.close();
      } catch {
        await writer.abort(new Error("upstream_stream_error")).catch(() => {});
      } finally {
        activeStreams.delete(principal);
      }
    })();

    body = transform.readable;
  }

  return new Response(body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
