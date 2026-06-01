/**
 * Google OAuth callback handler
 * Validates state/PKCE, checks the Google id_token nonce when decodable,
 * gets user info, and creates a session. This does not perform full OIDC
 * id_token signature/issuer/audience/expiry verification.
 */
import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCodeForToken, getGoogleUserInfo } from "@/lib/oauth/google";
import { applyAuthCookies, readCoreAuthPayload } from "@/lib/bff-auth-session";
import { CORE_API_URL } from "@/lib/env";
import { isCoreUpstreamUnreachable } from "@/lib/core-upstream-errors";
import { buildSignedBffOAuthProfile } from "@/lib/oauth/bff-exchange-signature";
import { isAdmin } from "@/lib/admin/admin-session";
import { resolvePostLoginRedirectPath } from "@/lib/auth-post-login-redirect";
import {
  buildLocalizedAppUrl,
  buildOAuthCallbackUrlFromContext,
  clearOAuthCookies,
  normalizeOAuthMobileCodeChallenge,
  normalizeOAuthMobileState,
  readOAuthContext,
} from "@/lib/oauth/flow-context";
import {
  buildMobileOAuthRedirectUrl,
  createMobileOAuthHandoffCode,
  isMobileOAuthFlow,
  MobileOAuthHandoffError,
  mobileOAuthErrorRedirect,
} from "@/lib/oauth/mobile-handoff";

function withGoogleCookieCleanup(response: NextResponse): NextResponse {
  clearOAuthCookies(response, [
    "oauth_state_google",
    "oauth_verifier_google",
    "oauth_nonce_google",
    "oauth_mobile_state_google",
    "oauth_mobile_code_challenge_google",
    "oauth_context_google",
  ]);
  return response;
}

function googleFailureRedirect(
  context: ReturnType<typeof readOAuthContext>,
  error: string,
  webParams: Record<string, string>,
  mobileState?: string | null,
): string {
  return mobileOAuthErrorRedirect(context, "google", error, mobileState) ?? buildLocalizedAppUrl(context, "/login", webParams);
}

function decodeUnverifiedGoogleIdTokenPayloadForNonce(idToken: string): { nonce?: unknown } {
  const encodedPayload = idToken.split(".")[1];
  if (!encodedPayload) {
    throw new Error("Google id_token is missing a payload segment.");
  }
  return JSON.parse(Buffer.from(encodedPayload, "base64url").toString());
}

// oxlint-disable-next-line react-doctor/nextjs-no-side-effect-in-get-handler -- OAuth providers must callback via GET; state/PKCE plus one-time provider codes guard replay.
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
  const mobileState = normalizeOAuthMobileState(request.cookies.get("oauth_mobile_state_google")?.value);
  const mobileCodeChallenge = normalizeOAuthMobileCodeChallenge(request.cookies.get("oauth_mobile_code_challenge_google")?.value);

  // ─── Handle OAuth Errors ────────────────────────────────────────────────────
  if (error) {
    console.error("Google OAuth error:", error, errorDescription);
    return withGoogleCookieCleanup(
      NextResponse.redirect(
        googleFailureRedirect(context, error, {
          oauth_error: errorDescription || error,
        }, mobileState),
      ),
    );
  }

  // ─── Validate Required Parameters ───────────────────────────────────────────
  if (!code) {
    return withGoogleCookieCleanup(
      NextResponse.redirect(
        googleFailureRedirect(context, "missing_code", { oauth_error: "missing_code" }, mobileState),
      ),
    );
  }

  // ─── Validate State (CSRF Protection) ──────────────────────────────────────
  const storedState = request.cookies.get("oauth_state_google")?.value;
  if (!storedState || state !== storedState) {
    console.error("Invalid OAuth state");
    return withGoogleCookieCleanup(
      NextResponse.redirect(
        googleFailureRedirect(context, "invalid_state", { oauth_error: "invalid_state" }, mobileState),
      ),
    );
  }

  if (isMobileOAuthFlow(context) && (!mobileState || !mobileCodeChallenge)) {
    return withGoogleCookieCleanup(
      NextResponse.redirect(
        buildMobileOAuthRedirectUrl(context, {
          provider: "google",
          error: "mobile_verifier_missing",
          ...(mobileState ? { state: mobileState } : {}),
        }),
      ),
    );
  }

  // ─── Get PKCE Verifier ───────────────────────────────────────────────────────
  const codeVerifier = request.cookies.get("oauth_verifier_google")?.value;
  if (!codeVerifier) {
    return withGoogleCookieCleanup(
      NextResponse.redirect(
        googleFailureRedirect(context, "missing_verifier", { oauth_error: "missing_verifier" }, mobileState),
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

    // The payload decode below is nonce-only and unverified. It is not full OIDC
    // id_token validation; state, PKCE, userinfo, and the signed Core exchange
    // remain the enforced controls in this route.
    const storedNonce = request.cookies.get("oauth_nonce_google")?.value;
    if (tokenResponse.id_token && storedNonce) {
      try {
        const payload = decodeUnverifiedGoogleIdTokenPayloadForNonce(tokenResponse.id_token);
        if (payload.nonce !== storedNonce) {
          console.error("Google OAuth nonce mismatch");
          return withGoogleCookieCleanup(
            NextResponse.redirect(
              googleFailureRedirect(context, "nonce_mismatch", {
                oauth_error: "nonce_mismatch",
              }, mobileState),
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
          googleFailureRedirect(context, "unverified_email", {
            oauth_error: "unverified_email",
          }, mobileState),
        ),
      );
    }

    const signedProfile = buildSignedBffOAuthProfile({
      provider: "google",
      provider_account_id: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      avatar_url: googleUser.picture ?? null,
    });

    if (isMobileOAuthFlow(context)) {
      const callbackState = mobileState;
      const callbackCodeChallenge = mobileCodeChallenge;
      if (!callbackState || !callbackCodeChallenge) {
        return withGoogleCookieCleanup(
          NextResponse.redirect(
            buildMobileOAuthRedirectUrl(context, {
              provider: "google",
              error: "mobile_verifier_missing",
            }),
          ),
        );
      }
      try {
        const handoffCode = await createMobileOAuthHandoffCode(signedProfile, callbackState, callbackCodeChallenge);
        return withGoogleCookieCleanup(
          NextResponse.redirect(
            buildMobileOAuthRedirectUrl(context, {
              provider: "google",
              code: handoffCode,
              state: callbackState,
            }),
          ),
        );
      } catch (handoffError) {
        if (
          handoffError instanceof MobileOAuthHandoffError &&
          handoffError.code === "ACCOUNT_PENDING_DELETION"
        ) {
          return withGoogleCookieCleanup(
            NextResponse.redirect(
              buildMobileOAuthRedirectUrl(context, {
                provider: "google",
                error: "account_pending_deletion",
                state: callbackState,
              }),
            ),
          );
        }
        throw handoffError;
      }
    }

    // ─── Call Core BE to Create/Retrieve User ────────────────────────────────
    const coreRes = await fetch(`${CORE_API_URL}/v1/auth/token`, {
      cache: "no-store",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BFF-Secret": process.env.BFF_SHARED_SECRET ?? "",
      },
      body: JSON.stringify(signedProfile),
    });

    if (!coreRes.ok) {
      const coreError = await coreRes.json().catch(() => ({}));
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

    // ─── Create Session and Redirect ─────────────────────────────────────────
    const redirectTo = buildLocalizedAppUrl(
      context,
      resolvePostLoginRedirectPath({
        isAdmin: isAdmin(auth.roles, auth.permissions),
        onboardingStatus: auth.onboarding_status ?? "pending",
        fromRaw: context.postLoginPath,
      }),
    );
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
          mobileOAuthErrorRedirect(context, "google", "core_unreachable", mobileState)
          ?? buildLocalizedAppUrl(context, "/login", {
              oauth_error: "core_unreachable",
            }),
        ),
      );
    }
    return withGoogleCookieCleanup(
      NextResponse.redirect(
        mobileOAuthErrorRedirect(
          context,
          "google",
          err instanceof MobileOAuthHandoffError ? err.code.toLowerCase() : "server_error",
          mobileState,
        )
        ?? buildLocalizedAppUrl(context, "/login", {
            oauth_error: "server_error",
          }),
      ),
    );
  }
}
