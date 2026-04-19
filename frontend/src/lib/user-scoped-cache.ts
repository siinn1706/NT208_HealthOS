/**
 * userScopedCacheKey — derive an authenticated user id from the session JWT
 * so every BFF Redis cache key is scoped to a single user.
 *
 * P0 fix: Previously many BFF routes used the literal string `"user"` as the
 * userId in cache keys, causing all users to share a single cached payload
 * (cross-user data collision). Always use this helper for user-scoped routes.
 */
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";

/** Decode `sub` (or `user_id`) claim from the session JWT cookie. */
export async function getAuthUserId(): Promise<string | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE_NAME)?.value ?? null;
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payloadStr = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(payloadStr, "base64").toString()) as Record<string, unknown>;
    const sub = payload.sub ?? payload.user_id;
    return sub != null ? String(sub) : null;
  } catch {
    return null;
  }
}

/**
 * Resolve a stable per-user cache scope.
 * Falls back to the literal `"anon"` only when no session is present —
 * routes that require auth should bail with 401 before reaching here.
 */
export async function getUserCacheScope(): Promise<string> {
  return (await getAuthUserId()) ?? "anon";
}
