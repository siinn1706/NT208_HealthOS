/**
 * BFF Users/me — proxy to Core BE /v1/users/me.
 * GET /api/v1/users/me — fetch current user profile
 * PATCH /api/v1/users/me — update current user profile
 *
 * Rule: Always validate session before forwarding to Core BE.
 * PATCH invalidates the gamification-summary cache so height/weight
 * changes are reflected immediately on /dashboard/progress.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";
import { cacheDel, cacheKey } from "@/lib/redis-cache";

/** Decode userId from the session cookie for cache invalidation. */
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
  return coreProxy(req, "/v1/users/me");
}

export async function PATCH(req: NextRequest) {
  // Invalidate gamification-summary cache so progress page picks up new height/weight
  const userId = await getUserIdFromCookie();
  if (userId) {
    await cacheDel(cacheKey(userId, "gamification-summary", {}));
  }
  return coreProxy(req, "/v1/users/me", { method: "PATCH" });
}
