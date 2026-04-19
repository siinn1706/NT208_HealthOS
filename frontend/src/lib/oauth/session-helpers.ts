/**
 * Tiny helpers shared by the B7 P3 link/init + link/callback BFF routes.
 *
 * The link flow runs while the user is already signed in: we need to read the
 * current `user_id` from the session JWT, attach it to the OAuth link state
 * cookie, then on callback verify the cookie matches the still-authenticated
 * session before posting to Core's `/v1/auth/oauth/links/attach`.
 */
import { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";

/**
 * Decode the JWT `sub` claim from the session cookie.
 *
 * We verify the user is signed in by the *presence* of the cookie; the JWT
 * itself was minted by Core BE so the BFF only needs `sub` for routing.
 * Core re-validates everything on `/v1/auth/oauth/links/attach`.
 */
export function getUserIdFromSession(req: NextRequest): string | null {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8"),
    ) as { sub?: string };
    return typeof payload.sub === "string" && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}
