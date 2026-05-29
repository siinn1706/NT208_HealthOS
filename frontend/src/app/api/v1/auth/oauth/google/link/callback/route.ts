/**
 * Google OAuth — link callback (B7 P3).
 *
 * Verifies the state/verifier + user binding, calls Core
 * `/v1/auth/oauth/links/attach` with `X-BFF-Secret`, then redirects back to
 * `/dashboard/profile` with a success or error indicator.
 */
import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCodeForToken, getGoogleUserInfo } from "@/lib/oauth/google";
import { getUserIdFromSession } from "@/lib/oauth/session-helpers";
import { CORE_API_URL } from "@/lib/env";
import { isCoreUpstreamUnreachable } from "@/lib/core-upstream-errors";
import { buildSignedBffOAuthProfile } from "@/lib/oauth/bff-exchange-signature";
import {
  buildLocalizedAppUrl,
  buildOAuthCallbackUrlFromContext,
  clearOAuthCookies,
  readOAuthContext,
} from "@/lib/oauth/flow-context";

function profileRedirect(
  context: ReturnType<typeof readOAuthContext>,
  params: Record<string, string>,
): NextResponse {
  const res = NextResponse.redirect(
    buildLocalizedAppUrl(context, "/dashboard/profile", params),
  );
  clearOAuthCookies(res, [
    "oauth_link_state_google",
    "oauth_link_verifier_google",
    "oauth_link_nonce_google",
    "oauth_link_user_google",
    "oauth_link_context_google",
  ]);
  return res;
}

export async function GET(request: NextRequest) {
  const context = readOAuthContext(request, "google", "link", [
    process.env.OAUTH_GOOGLE_LINK_CALLBACK_URL,
    process.env.OAUTH_GOOGLE_CALLBACK_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const sessionUserId = getUserIdFromSession(request);
  if (!sessionUserId) {
    // The user signed out mid-flow; nothing to attach to.
    return profileRedirect(context, { link_error: "auth_required" });
  }

  if (error) {
    return profileRedirect(context, { link_error: error });
  }
  if (!code) return profileRedirect(context, { link_error: "missing_code" });

  const storedState = request.cookies.get("oauth_link_state_google")?.value;
  if (!storedState || state !== storedState) {
    return profileRedirect(context, { link_error: "invalid_state" });
  }
  const codeVerifier = request.cookies.get("oauth_link_verifier_google")?.value;
  if (!codeVerifier) return profileRedirect(context, { link_error: "missing_verifier" });

  const cookieUserId = request.cookies.get("oauth_link_user_google")?.value;
  // Defense in depth: state cookie was bound to a user id at init time;
  // require that the still-authenticated session matches.
  if (!cookieUserId || cookieUserId !== sessionUserId) {
    return profileRedirect(context, { link_error: "user_mismatch" });
  }

  try {
    const redirectUri = buildOAuthCallbackUrlFromContext(
      context,
      request,
      "/api/v1/auth/oauth/google/link/callback",
      [
        process.env.OAUTH_GOOGLE_LINK_CALLBACK_URL,
        process.env.OAUTH_GOOGLE_CALLBACK_URL,
        process.env.NEXT_PUBLIC_APP_URL,
      ],
    );
    const tokenResponse = await exchangeGoogleCodeForToken({
      code,
      codeVerifier,
      redirectUri,
    });
    const googleUser = await getGoogleUserInfo(tokenResponse.access_token);
    // B7 review P1-4 — re-check email verification on the link callback.
    // The original sign-in callback enforces this; the link callback was
    // missing it, which would let an attacker link an unverified Google
    // account and gain a permanent backdoor (since the link grants future
    // sign-in via `(provider, provider_account_id)` lookup).
    if (googleUser.verified_email === false || googleUser.email_verified === false) {
      return profileRedirect(context, {
        link_error: "unverified_email",
        provider: "google",
      });
    }

    const coreRes = await fetch(`${CORE_API_URL}/v1/auth/oauth/links/attach`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BFF-Secret": process.env.BFF_SHARED_SECRET ?? "",
      },
      body: JSON.stringify({
        user_id: sessionUserId,
        profile: buildSignedBffOAuthProfile({
          provider: "google",
          provider_account_id: googleUser.id,
          email: googleUser.email,
          name: googleUser.name,
          avatar_url: googleUser.picture ?? null,
        }),
      }),
    });

    if (coreRes.status === 409) {
      return profileRedirect(context, { link_error: "already_linked", provider: "google" });
    }
    if (!coreRes.ok) {
      return profileRedirect(context, { link_error: "server_error", provider: "google" });
    }
    return profileRedirect(context, { linked: "google" });
  } catch (err) {
    if (isCoreUpstreamUnreachable(err)) {
      return profileRedirect(context, { link_error: "core_unreachable", provider: "google" });
    }
    return profileRedirect(context, { link_error: "server_error", provider: "google" });
  }
}
