/**
 * Google OAuth callback handler
 * Validates state, exchanges code for token, gets user info, creates session
 */
import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCodeForToken, getGoogleUserInfo } from "@/lib/oauth/google";

import { CORE_API_URL } from "@/lib/env";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // ─── Handle OAuth Errors ────────────────────────────────────────────────────
  if (error) {
    console.error("Google OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/login?oauth_error=${encodeURIComponent(errorDescription || error)}`, request.url).toString()
    );
  }

  // ─── Validate Required Parameters ───────────────────────────────────────────
  if (!code) {
    return NextResponse.redirect(
      new URL("/login?oauth_error=missing_code", request.url).toString()
    );
  }

  // ─── Validate State (CSRF Protection) ──────────────────────────────────────
  const storedState = request.cookies.get("oauth_state_google")?.value;
  if (!storedState || state !== storedState) {
    console.error("Invalid OAuth state");
    return NextResponse.redirect(
      new URL("/login?oauth_error=invalid_state", request.url).toString()
    );
  }

  // ─── Get PKCE Verifier ───────────────────────────────────────────────────────
  const codeVerifier = request.cookies.get("oauth_verifier_google")?.value;
  if (!codeVerifier) {
    return NextResponse.redirect(
      new URL("/login?oauth_error=missing_verifier", request.url).toString()
    );
  }

  // ─── Exchange Code for Token ────────────────────────────────────────────────
  try {
    const redirectUri = process.env.OAUTH_GOOGLE_CALLBACK_URL!;
    const tokenResponse = await exchangeGoogleCodeForToken({
      code,
      codeVerifier,
      redirectUri,
    });

    // ─── Get User Info ─────────────────────────────────────────────────────────
    const googleUser = await getGoogleUserInfo(tokenResponse.access_token);

    // ─── Call Core BE to Create/Retrieve User ────────────────────────────────
    const coreRes = await fetch(`${CORE_API_URL}/v1/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "google",
        provider_account_id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        avatar_url: googleUser.picture ?? null,
      }),
    });

    if (!coreRes.ok) {
      const coreError = await coreRes.json().catch(() => ({}));
      console.error("Core BE token exchange failed:", coreError);
      throw new Error("Core BE authentication failed");
    }

    const coreData = await coreRes.json();
    const accessToken = coreData.data.access_token;

    // ─── Create Session and Redirect ─────────────────────────────────────────
    const redirectTo = new URL("/dashboard", request.url);
    const response = NextResponse.redirect(redirectTo.toString());

    // Set session cookie
    response.cookies.set("healthos.session", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    // Clear temporary OAuth cookies
    response.cookies.delete("oauth_state_google");
    response.cookies.delete("oauth_verifier_google");
    response.cookies.delete("oauth_nonce_google");

    return response;
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/login?oauth_error=server_error", request.url).toString()
    );
  }
}
