/**
 * POST /api/v1/meals/analyze-photo
 *
 * Trigger: User submits a photo from /dashboard/meals/snap.
 * Request:  multipart/form-data { image: File, meal_type?: string }
 * Response: { job_id: string }
 *
 * The browser submits raw multipart/form-data — we forward it to Core BE as-is
 * (preserving the boundary in Content-Type) using the multipart proxy branch.
 * Cap is 10 MiB to match Core's accepted upload size (UX plan §I).
 *
 * GET /api/v1/meals/analyze-photo/:job_id is handled in the [job_id]/ route.
 *
 * Rate limiting: 6 requests per user per 10 s burst window to protect GPU
 * inference workers from a single authenticated user saturating capacity.
 *
 * Note: getBffAuthContext is called here for the rate-limit principal, and
 * coreProxy (via multipartProxy) independently reads the same cookie store for
 * forwarding auth. Both reads hit the same immutable Next.js cookie store, so
 * there is no divergence risk. A future refactor could add a preResolvedToken
 * option to coreProxy to eliminate the redundant read.
 */

import { NextRequest, NextResponse } from "next/server";
import { getBffAuthContext } from "@/lib/bff-auth-context";
import { assertSameOrigin } from "@/lib/bff-origin-guard";
import { multipartProxy } from "@/lib/bff/multipart-proxy";
import { takeToken } from "@/lib/rate-limit";

const ANALYZE_PHOTO_RATE_LIMIT = { burst: 6, refillIntervalMs: 10_000 } as const;

export async function POST(req: NextRequest) {
  const csrfReject = assertSameOrigin(req);
  if (csrfReject) return csrfReject;

  // Rate-limit by user-bucketed principal. Unauthenticated requests (no cookie/bearer) are
  // handled downstream by multipartProxy / coreProxy (returns 401).
  const ctx = await getBffAuthContext(req);
  if (ctx.principal) {
    const rl = takeToken(`analyze-photo:${ctx.principal}`, ANALYZE_PHOTO_RATE_LIMIT);
    if (!rl.ok) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later." } },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
        },
      );
    }
  }

  return multipartProxy(req, "/v1/meals/analyze-photo");
}
