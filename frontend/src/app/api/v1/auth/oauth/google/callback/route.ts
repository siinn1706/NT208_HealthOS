/**
 * Google OAuth callback handler
 * Validates state, exchanges code for token, gets user info, creates session
 */
import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCodeForToken, getGoogleUserInfo } from "@/lib/oauth/google";
import { applyAuthCookies, readCoreAuthPayload } from "@/lib/bff-auth-session";
import { CORE_API_URL } from "@/lib/env";
import { isCoreUpstreamUnreachable } from "@/lib/core-upstream-errors";
import { buildSignedBffOAuthProfile } from "@/lib/oauth/bff-exchange-signature";
import {
  buildLocalizedAppUrl,
  buildOAuthCallbackUrlFromContext,
  clearOAuthCookies,
  readOAuthContext,
} from "@/lib/oauth/flow-context";

function withGoogleCookieCleanup(response: NextResponse): NextResponse {
  clearOAuthCookies(response, [
    "oauth_state_google",
    "oauth_verifier_google",
    "oauth_nonce_google",
    "oauth_context_google",
  ]);
  return response;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const context = readOAuthContext(request, "google", "signin", [
    process.env.OAUTH_GOOGLE_CALLBACK_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]);

  // ─── Handle OAuth Errors ────────────────────────────────────────────────────
  if (error) {
    console.error("Google OAuth error:", error, errorDescription);
    return withGoogleCookieCleanup(
      NextResponse.redirect(
        buildLocalizedAppUrl(context, "/login", {
          oauth_error: errorDescription || error,
        }),
      ),
    );
  }

  // ─── Validate Required Parameters ───────────────────────────────────────────
  if (!code) {
    return withGoogleCookieCleanup(
      NextResponse.redirect(
        buildLocalizedAppUrl(context, "/login", { oauth_error: "missing_code" }),
      ),
    );
  }

  // ─── Validate State (CSRF Protection) ──────────────────────────────────────
  const storedState = request.cookies.get("oauth_state_google")?.value;
  if (!storedState || state !== storedState) {
    console.error("Invalid OAuth state");
    return withGoogleCookieCleanup(
      NextResponse.redirect(
        buildLocalizedAppUrl(context, "/login", { oauth_error: "invalid_state" }),
      ),
    );
  }

  // ─── Get PKCE Verifier ───────────────────────────────────────────────────────
  const codeVerifier = request.cookies.get("oauth_verifier_google")?.value;
  if (!codeVerifier) {
    return withGoogleCookieCleanup(
      NextResponse.redirect(
        buildLocalizedAppUrl(context, "/login", { oauth_error: "missing_verifier" }),
      ),
    );
  }

  // ─── Exchange Code for Token ────────────────────────────────────────────────
  try {
    const redirectUri = buildOAuthCallbackUrlFromContext(
      context,
      request,
      "/api/v1/auth/oauth/google/callback",
      [process.env.OAUTH_GOOGLE_CALLBACK_URL, process.env.NEXT_PUBLIC_APP_URL],
    );
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
          return withGoogleCookieCleanup(
            NextResponse.redirect(
              buildLocalizedAppUrl(context, "/login", {
                oauth_error: "nonce_mismatch",
              }),
            ),
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
      return withGoogleCookieCleanup(
        NextResponse.redirect(
          buildLocalizedAppUrl(context, "/login", {
            oauth_error: "unverified_email",
          }),
        ),
      );
    }

    // ─── Call Core BE to Create/Retrieve User ────────────────────────────────
    const coreRes = await fetch(`${CORE_API_URL}/v1/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BFF-Secret": process.env.BFF_SHARED_SECRET ?? "",
      },
      body: JSON.stringify(buildSignedBffOAuthProfile({
        provider: "google",
        provider_account_id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        avatar_url: googleUser.picture ?? null,
      })),
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
        return withGoogleCookieCleanup(
          NextResponse.redirect(
            buildLocalizedAppUrl(context, "/login", {
              restore: "pending",
              provider: "google",
            }),
          ),
        );
      }
      console.error("Core BE token exchange failed:", coreError);
      throw new Error("Core BE authentication failed");
    }

    const coreData = await coreRes.json().catch(() => null);
    const auth = readCoreAuthPayload(coreData);
    if (!auth) {
      throw new Error("Core BE returned no token payload");
    }
    const onboardingStatus = auth.onboarding_status ?? "pending";

    // ─── Create Session and Redirect ─────────────────────────────────────────
    const redirectTo = onboardingStatus === "completed"
      ? buildLocalizedAppUrl(
          context,
          context.postLoginPath ?? "/dashboard",
        )
      : buildLocalizedAppUrl(context, "/onboarding");
    const response = NextResponse.redirect(redirectTo);

    applyAuthCookies(response, auth);

    // Clear temporary OAuth cookies
    return withGoogleCookieCleanup(response);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    if (isCoreUpstreamUnreachable(err)) {
      console.error(
        `Core BE unreachable at ${CORE_API_URL}. Start the API (see README) or fix CORE_API_URL in frontend/.env.local.`
      );
      return withGoogleCookieCleanup(
        NextResponse.redirect(
          buildLocalizedAppUrl(context, "/login", {
            oauth_error: "core_unreachable",
          }),
        ),
      );
    }
    return withGoogleCookieCleanup(
      NextResponse.redirect(
        buildLocalizedAppUrl(context, "/login", {
          oauth_error: "server_error",
        }),
      ),
    );
  }
}
