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
 * Rate limiting: 6 requests per session per 10 s burst window to protect GPU
 * inference workers from a single authenticated user saturating capacity.
 */

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/bff-origin-guard";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";
import { multipartProxy } from "@/lib/bff/multipart-proxy";
import { takeToken } from "@/lib/rate-limit";

const ANALYZE_PHOTO_RATE_LIMIT = { burst: 6, refillIntervalMs: 10_000 } as const;

export async function POST(req: NextRequest) {
  const csrfReject = assertSameOrigin(req);
  if (csrfReject) return csrfReject;

  // Rate-limit by session token hash. Unauthenticated requests (no cookie) are
  // handled downstream by multipartProxy / coreProxy (returns 401).
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (sessionToken) {
    const sessionKey = createHash("sha256").update(sessionToken).digest("hex");
    const rl = takeToken(`analyze-photo:${sessionKey}`, ANALYZE_PHOTO_RATE_LIMIT);
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
