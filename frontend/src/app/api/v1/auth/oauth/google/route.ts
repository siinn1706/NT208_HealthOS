/**
 * Google OAuth initiation endpoint
 * Generates PKCE code verifier/challenge and state, redirects to Google
 */
import { NextResponse } from "next/server";
import { generateCodeVerifier, generateCodeChallenge, generateState, generateNonce } from "@/lib/oauth/pkce";
import { getGoogleAuthUrl } from "@/lib/oauth/google";

const COOKIE_MAX_AGE = 600; // 10 minutes

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.OAUTH_GOOGLE_CALLBACK_URL;

  // Check if OAuth is configured
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: "Google OAuth not configured" },
      { status: 503 }
    );
  }

  try {
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

    // Store PKCE verifier and state in httpOnly cookies
    response.cookies.set("oauth_state_google", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    response.cookies.set("oauth_verifier_google", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    response.cookies.set("oauth_nonce_google", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Google OAuth initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth" },
      { status: 500 }
    );
  }
}
