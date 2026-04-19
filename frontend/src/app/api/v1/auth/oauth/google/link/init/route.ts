/**
 * Google OAuth — link initiation (B7 P3).
 *
 * Triggered from "Settings → Linked Accounts → Add Google" while the user is
 * already authenticated. Distinct from `/api/v1/auth/oauth/google/route.ts`
 * (sign-in init) because:
 *   1. We require an authenticated session (otherwise 401 — no fallback to login).
 *   2. We set a `link` intent cookie so the callback knows to call
 *      `/v1/auth/oauth/links/attach` instead of the sign-in `/v1/auth/token`.
 */
import { NextRequest, NextResponse } from "next/server";
import { generateCodeChallenge, generateCodeVerifier, generateNonce, generateState } from "@/lib/oauth/pkce";
import { getGoogleAuthUrl } from "@/lib/oauth/google";
import { getUserIdFromSession } from "@/lib/oauth/session-helpers";
import { getLocaleFromReferer } from "@/lib/locale-path";

const COOKIE_MAX_AGE = 600; // 10 minutes

export async function GET(request: NextRequest) {
  const locale = getLocaleFromReferer(request);
  const userId = getUserIdFromSession(request);
  if (!userId) {
    return NextResponse.redirect(
      new URL(`/${locale}/login?from=/dashboard/profile`, request.url).toString(),
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  // Reuse the same callback URL but override at runtime via OAUTH_GOOGLE_LINK_CALLBACK_URL when set.
  const redirectUri =
    process.env.OAUTH_GOOGLE_LINK_CALLBACK_URL ||
    process.env.OAUTH_GOOGLE_CALLBACK_URL?.replace(
      "/api/v1/auth/oauth/google/callback",
      "/api/v1/auth/oauth/google/link/callback",
    );

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 503 });
  }

  const codeVerifier = await generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();
  const nonce = generateNonce();

  const authUrl = getGoogleAuthUrl({ clientId, redirectUri, codeChallenge, state, nonce });

  const response = NextResponse.redirect(authUrl, 302);
  // Distinct cookie names so they cannot collide with the sign-in flow.
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
  response.cookies.set("oauth_link_state_google", state, opts);
  response.cookies.set("oauth_link_verifier_google", codeVerifier, opts);
  response.cookies.set("oauth_link_nonce_google", nonce, opts);
  // Bind the link state to the current user — checked again in the callback.
  response.cookies.set("oauth_link_user_google", userId, opts);
  return response;
}
