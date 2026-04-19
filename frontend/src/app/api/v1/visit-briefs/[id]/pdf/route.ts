/**
 * BFF — Stretch P5 PDF download.
 *
 * GET /api/v1/visit-briefs/{id}/pdf?locale=en|vi
 *   → GET /v1/visit-briefs/{id}/pdf
 *
 * Returns the upstream PDF stream verbatim. We can't use the standard JSON
 * coreProxy here because the response body is binary; this hand-rolled
 * variant just forwards the auth header and pipes the bytes through.
 *
 * Falls through to a 503 envelope if WeasyPrint is missing on the worker
 * (matches `PdfRenderUnavailable` from the BE service).
 */
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";
import { CORE_API_URL } from "@/lib/env";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  if (!token) {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "Authentication required." } },
      { status: 401 },
    );
  }
  const { id } = await ctx.params;
  const url = new URL(`/v1/visit-briefs/${encodeURIComponent(id)}/pdf`, CORE_API_URL);
  req.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));

  const upstream = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (upstream.status === 503) {
    const body = await upstream.json().catch(() => null);
    return NextResponse.json(
      body ?? {
        error: {
          code: "PDF_RENDER_UNAVAILABLE",
          message: "PDF rendering is not available on this server.",
        },
      },
      { status: 503 },
    );
  }
  if (!upstream.ok) {
    const body = await upstream.json().catch(() => null);
    return NextResponse.json(
      body ?? { error: { code: `HTTP_${upstream.status}`, message: "Request failed." } },
      { status: upstream.status },
    );
  }

  const blob = await upstream.arrayBuffer();
  return new NextResponse(blob, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        upstream.headers.get("content-disposition") ??
        `attachment; filename="visit-brief-${id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
