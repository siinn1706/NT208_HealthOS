/**
 * Google OAuth initiation endpoint
 * Generates PKCE code verifier/challenge and state, redirects to Google
 */
import { NextRequest, NextResponse } from "next/server";
import { generateCodeVerifier, generateCodeChallenge, generateState, generateNonce } from "@/lib/oauth/pkce";
import { getGoogleAuthUrl } from "@/lib/oauth/google";
import {
  buildOAuthCallbackUrl,
  createOAuthContext,
  getOAuthCookieOptions,
  setOAuthContextCookie,
} from "@/lib/oauth/flow-context";

const COOKIE_MAX_AGE = 600; // 10 minutes

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // Check if OAuth is configured
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Google OAuth not configured" },
      { status: 503 }
    );
  }

  try {
    const url = new URL(request.url);
    const redirectUri = buildOAuthCallbackUrl(
      request,
      "/api/v1/auth/oauth/google/callback",
      [process.env.OAUTH_GOOGLE_CALLBACK_URL, process.env.NEXT_PUBLIC_APP_URL],
    );
    const context = createOAuthContext(
      request,
      {
        locale: url.searchParams.get("locale") ?? request.cookies.get("NEXT_LOCALE")?.value,
        postLoginPath: url.searchParams.get("from"),
      },
      [process.env.OAUTH_GOOGLE_CALLBACK_URL, process.env.NEXT_PUBLIC_APP_URL],
    );
    // Generate PKCE parameters
    const codeVerifier = await generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();
    const nonce = generateNonce();

    // Build Google authorization URL
    const authUrl = getGoogleAuthUrl({
      clientId,
      redirectUri,
      codeChallenge,
      state,
      nonce,
    });

    // Create redirect response
    const response = NextResponse.redirect(authUrl, 302);
    const cookieOptions = getOAuthCookieOptions(request, COOKIE_MAX_AGE);

    // Store PKCE verifier and state in httpOnly cookies
    response.cookies.set("oauth_state_google", state, cookieOptions);

    response.cookies.set("oauth_verifier_google", codeVerifier, cookieOptions);

    response.cookies.set("oauth_nonce_google", nonce, cookieOptions);
    setOAuthContextCookie(response, request, "google", "signin", context, COOKIE_MAX_AGE);

    return response;
  } catch (error) {
    console.error("Google OAuth initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth" },
      { status: 500 }
    );
  }
}
