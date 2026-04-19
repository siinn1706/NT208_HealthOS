/**
 * BFF: Emergency Health Card — PUBLIC, UNAUTHENTICATED proxy.
 *
 * GET /api/v1/public/emergency/{token}  →  Core BE  /v1/public/emergency/{token}
 *
 * Security boundaries (this file is the canonical place reviewers audit):
 *
 *   1. **Hand-rolled fetch — never `coreProxy`.** The standard helper reads
 *      the session cookie and adds `Authorization: Bearer …` automatically.
 *      For the public emergency surface that would be a privacy bug: a
 *      logged-in owner scanning their own QR card would see Core mistake
 *      them for the responder. We sidestep the helper completely so the
 *      auth boundary is impossible to misread.
 *
 *   2. **No session cookie read.** The handler does NOT call
 *      `cookies()` or import `SESSION_COOKIE_NAME`. Adding either is the
 *      single biggest red flag in PR review.
 *
 *   3. **No Authorization header forwarded.** Even if a `cookie:` header
 *      sneaks through the request, we explicitly do not propagate it.
 *
 *   4. **`Cache-Control: private, no-store`** + **`X-Robots-Tag: noindex`**
 *      so CDNs / responder phones / search engines don't cache or index
 *      revoked cards.
 *
 *   5. **`X-Forwarded-For` propagated** so the upstream rate limiter and
 *      access log see the real client IP for `/24` / `/64` truncation.
 *
 *   6. **30-second upstream timeout** matching `coreProxy` so a hung Core
 *      doesn't pin BFF workers.
 */
import { NextRequest, NextResponse } from "next/server";
import { CORE_API_URL } from "@/lib/env";

const PRIVACY_HEADERS: Record<string, string> = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
  // Belt-and-braces: an X-Frame-Options on this surface prevents the
  // public card from being silently embedded in an attacker iframe to
  // grab a screenshot of someone's emergency data.
  "X-Frame-Options": "DENY",
  Pragma: "no-cache",
};

function withPrivacyHeaders(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(PRIVACY_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

function gone(): NextResponse {
  return withPrivacyHeaders(
    NextResponse.json(
      {
        error: {
          code: "EMERGENCY_CARD_UNAVAILABLE",
          message:
            "This emergency card is no longer active. Please contact the patient or use other identification.",
        },
      },
      { status: 410 }
    )
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token || token.length < 16 || token.length > 128) {
    return gone();
  }

  const upstream = new URL(
    `/v1/public/emergency/${encodeURIComponent(token)}`,
    CORE_API_URL
  );

  // Build outbound headers from scratch — DO NOT spread `req.headers`.
  // We only forward what the upstream genuinely needs.
  const outboundHeaders: Record<string, string> = {
    Accept: "application/json",
  };

  const fwd =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    "";
  if (fwd) {
    outboundHeaders["X-Forwarded-For"] = fwd;
  }
  const userAgent = req.headers.get("user-agent");
  if (userAgent) {
    // Truncated by the upstream service before persistence.
    outboundHeaders["User-Agent"] = userAgent.slice(0, 512);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const upstreamRes = await fetch(upstream.toString(), {
      method: "GET",
      headers: outboundHeaders,
      cache: "no-store",
      signal: controller.signal,
      // Explicit: do not include credentials (cookies) on the outbound
      // request even though Node fetch does not by default.
      credentials: "omit" as RequestCredentials,
    });
    clearTimeout(timeoutId);

    // Read body once. Parse on success path; on 4xx surface upstream's
    // error body verbatim (the BE deliberately returns the same canonical
    // 410 for every failure mode so an attacker cannot distinguish them).
    const data: unknown = await upstreamRes.json().catch(() => null);

    if (upstreamRes.status >= 500) {
      // Don't leak stack traces or upstream internal paths on 5xx —
      // the public viewer should see "unavailable" not "500 ISE".
      return gone();
    }

    if (upstreamRes.status === 410 || upstreamRes.status === 404) {
      return gone();
    }

    // F3 — 429 (rate-limited) is forwarded verbatim with body intact so
    // the page can render its distinct "slow down — retry in N seconds"
    // state. We also propagate the upstream Retry-After header so any
    // downstream client (e.g. curl scripts) can honor it.
    const next = withPrivacyHeaders(
      NextResponse.json(data ?? {}, { status: upstreamRes.status })
    );
    if (upstreamRes.status === 429) {
      const retryAfter = upstreamRes.headers.get("retry-after");
      if (retryAfter) next.headers.set("Retry-After", retryAfter);
    }
    return next;
  } catch (err) {
    clearTimeout(timeoutId);
    // L4 — both timeout and network failure end in the same 410 by design;
    // we never reveal whether the upstream is down vs. the token is bad.
    void err;
    return gone();
  }
}
