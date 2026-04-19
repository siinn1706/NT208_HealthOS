/**
 * BFF: Emergency Health Card — owner profile (preview + overrides).
 *
 * GET   /api/v1/users/me/emergency-profile  → derived card preview, tokens summary, completeness
 * PATCH /api/v1/users/me/emergency-profile  → update overrides + master publish switch
 *
 * Both endpoints require an authenticated session — `coreProxy` defaults
 * `requireAuth: true`. The PATCH path also invalidates the dashboard
 * preview cache so the next page load re-renders the new overrides.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";
import { cacheDel, cacheKey } from "@/lib/redis-cache";

const CORE_PATH = "/v1/users/me/emergency-profile";

async function getUserIdFromCookie(): Promise<string | null> {
  try {
    const { cookies } = await import("next/headers");
    const { SESSION_COOKIE_NAME } = await import("@/lib/bff-auth-cookie");
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null;
    if (!token) return null;
    const payloadStr = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(payloadStr, "base64").toString());
    return (payload.sub ?? payload.user_id ?? null) as string | null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  return coreProxy(req, CORE_PATH);
}

export async function PATCH(req: NextRequest) {
  // Mirrors the cache-invalidation pattern in /api/v1/users/me PATCH —
  // any owner-side override (visibility flip, equipment notes edit, etc.)
  // must drop the cached preview so the next page load reflects the change.
  const userId = await getUserIdFromCookie();
  if (userId) {
    await cacheDel(cacheKey(userId, "emergency-card-preview", {}));
  }
  return coreProxy(req, CORE_PATH, { method: "PATCH" });
}
