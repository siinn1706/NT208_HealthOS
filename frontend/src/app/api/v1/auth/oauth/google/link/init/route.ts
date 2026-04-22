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
import {
  buildLocalizedAppUrl,
  buildOAuthCallbackUrl,
  createOAuthContext,
  getOAuthCookieOptions,
  setOAuthContextCookie,
} from "@/lib/oauth/flow-context";

const COOKIE_MAX_AGE = 600; // 10 minutes

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? request.cookies.get("NEXT_LOCALE")?.value;
  const context = createOAuthContext(
    request,
    {
      locale,
      postLoginPath: url.searchParams.get("from") ?? "/dashboard/profile",
    },
    [process.env.OAUTH_GOOGLE_LINK_CALLBACK_URL, process.env.OAUTH_GOOGLE_CALLBACK_URL, process.env.NEXT_PUBLIC_APP_URL],
  );
  const userId = getUserIdFromSession(request);
  if (!userId) {
    return NextResponse.redirect(
      buildLocalizedAppUrl(context, "/login", { from: "/dashboard/profile" }),
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = buildOAuthCallbackUrl(
    request,
    "/api/v1/auth/oauth/google/link/callback",
    [
      process.env.OAUTH_GOOGLE_LINK_CALLBACK_URL,
      process.env.OAUTH_GOOGLE_CALLBACK_URL,
      process.env.NEXT_PUBLIC_APP_URL,
    ],
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
  const opts = getOAuthCookieOptions(request, COOKIE_MAX_AGE);
  // Distinct cookie names so they cannot collide with the sign-in flow.
  response.cookies.set("oauth_link_state_google", state, opts);
  response.cookies.set("oauth_link_verifier_google", codeVerifier, opts);
  response.cookies.set("oauth_link_nonce_google", nonce, opts);
  // Bind the link state to the current user — checked again in the callback.
  response.cookies.set("oauth_link_user_google", userId, opts);
  setOAuthContextCookie(response, request, "google", "link", context, COOKIE_MAX_AGE);
  return response;
}
