/**
 * Google OAuth callback handler
 * Validates state, exchanges code for token, gets user info, creates session
 */
import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCodeForToken, getGoogleUserInfo } from "@/lib/oauth/google";
import {
  META_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_SECURE,
} from "@/lib/bff-auth-cookie";
import { getLocaleFromReferer } from "@/lib/locale-path";
import { CORE_API_URL } from "@/lib/env";
import { isCoreUpstreamUnreachable } from "@/lib/core-upstream-errors";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const locale = getLocaleFromReferer(request);

  // ─── Handle OAuth Errors ────────────────────────────────────────────────────
  if (error) {
    console.error("Google OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/${locale}/login?oauth_error=${encodeURIComponent(errorDescription || error)}`, request.url).toString()
    );
  }

  // ─── Validate Required Parameters ───────────────────────────────────────────
  if (!code) {
    return NextResponse.redirect(
      new URL(`/${locale}/login?oauth_error=missing_code`, request.url).toString()
    );
  }

  // ─── Validate State (CSRF Protection) ──────────────────────────────────────
  const storedState = request.cookies.get("oauth_state_google")?.value;
  if (!storedState || state !== storedState) {
    console.error("Invalid OAuth state");
    return NextResponse.redirect(
      new URL(`/${locale}/login?oauth_error=invalid_state`, request.url).toString()
    );
  }

  // ─── Get PKCE Verifier ───────────────────────────────────────────────────────
  const codeVerifier = request.cookies.get("oauth_verifier_google")?.value;
  if (!codeVerifier) {
    return NextResponse.redirect(
      new URL(`/${locale}/login?oauth_error=missing_verifier`, request.url).toString()
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

    // ─── Validate Nonce (OIDC replay protection) ──────────────────────────────
    const storedNonce = request.cookies.get("oauth_nonce_google")?.value;
    if (tokenResponse.id_token && storedNonce) {
      try {
        const payload = JSON.parse(
          Buffer.from(tokenResponse.id_token.split(".")[1], "base64url").toString()
        );
        if (payload.nonce !== storedNonce) {
          console.error("Google OAuth nonce mismatch");
          return NextResponse.redirect(
            new URL(`/${locale}/login?oauth_error=nonce_mismatch`, request.url).toString()
          );
        }
      } catch (e) {
        // Non-blocking — nonce is defense-in-depth; PKCE+state already protect the flow
        console.error("Failed to decode id_token for nonce validation:", e);
      }
    }

    // ─── Get User Info ─────────────────────────────────────────────────────────
    const googleUser = await getGoogleUserInfo(tokenResponse.access_token);

    // ─── Verify Email ──────────────────────────────────────────────────────────
    if (googleUser.verified_email === false || googleUser.email_verified === false) {
      return NextResponse.redirect(
        new URL(`/${locale}/login?oauth_error=unverified_email`, request.url)
      );
    }

    // ─── Call Core BE to Create/Retrieve User ────────────────────────────────
    const coreRes = await fetch(`${CORE_API_URL}/v1/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BFF-Secret": process.env.BFF_SHARED_SECRET ?? "",
      },
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
      // B7 review P0-3 — surface the pending-deletion case as a dedicated
      // restore prompt instead of a generic OAuth failure.
      if (
        coreRes.status === 403 &&
        (coreError?.detail?.code === "ACCOUNT_PENDING_DELETION" ||
          coreError?.error?.code === "ACCOUNT_PENDING_DELETION")
      ) {
        return NextResponse.redirect(
          new URL(
            `/${locale}/login?restore=pending&provider=google`,
            request.url,
          ).toString(),
        );
      }
      console.error("Core BE token exchange failed:", coreError);
      throw new Error("Core BE authentication failed");
    }

    const coreData = await coreRes.json();
    const accessToken = coreData.data.access_token;

    const onboardingStatus: string = coreData.data?.onboarding_status ?? "pending";

    // ─── Create Session and Redirect ─────────────────────────────────────────
    const redirectTo = onboardingStatus === "completed"
      ? new URL(`/${locale}/dashboard`, request.url)
      : new URL(`/${locale}/onboarding`, request.url);
    const response = NextResponse.redirect(redirectTo.toString());

    // Session cookie (httpOnly — carries JWT)
    response.cookies.set(SESSION_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: SESSION_COOKIE_SECURE,
      sameSite: "lax",
      maxAge: SESSION_COOKIE_MAX_AGE,
      path: "/",
    });

    // Meta cookie (httpOnly — carries onboarding_status for src/proxy.ts)
    response.cookies.set(
      META_COOKIE_NAME,
      JSON.stringify({ onboarding_status: onboardingStatus }),
      { httpOnly: true, secure: SESSION_COOKIE_SECURE, sameSite: "lax", maxAge: SESSION_COOKIE_MAX_AGE, path: "/" }
    );

    // Clear temporary OAuth cookies
    response.cookies.delete("oauth_state_google");
    response.cookies.delete("oauth_verifier_google");
    response.cookies.delete("oauth_nonce_google");

    return response;
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    if (isCoreUpstreamUnreachable(err)) {
      console.error(
        `Core BE unreachable at ${CORE_API_URL}. Start the API (see README) or fix CORE_API_URL in frontend/.env.local.`
      );
      return NextResponse.redirect(
        new URL(`/${locale}/login?oauth_error=core_unreachable`, request.url).toString()
      );
    }
    return NextResponse.redirect(
      new URL(`/${locale}/login?oauth_error=server_error`, request.url).toString()
    );
  }
}
