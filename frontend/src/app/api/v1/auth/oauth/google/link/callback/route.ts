/**
 * Google OAuth — link callback (B7 P3).
 *
 * Verifies the state/verifier/nonce + user binding, calls Core
 * `/v1/auth/oauth/links/attach` with `X-BFF-Secret`, then redirects back to
 * `/dashboard/profile` with a success or error indicator.
 */
import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCodeForToken, getGoogleUserInfo } from "@/lib/oauth/google";
import { getLocaleFromReferer } from "@/lib/locale-path";
import { getUserIdFromSession } from "@/lib/oauth/session-helpers";
import { CORE_API_URL } from "@/lib/env";
import { isCoreUpstreamUnreachable } from "@/lib/core-upstream-errors";

function profileRedirect(request: NextRequest, locale: string, params: Record<string, string>): NextResponse {
  const url = new URL(`/${locale}/dashboard/profile`, request.url);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = NextResponse.redirect(url.toString());
  ["oauth_link_state_google", "oauth_link_verifier_google", "oauth_link_nonce_google", "oauth_link_user_google"].forEach(
    (name) => res.cookies.delete(name),
  );
  return res;
}

export async function GET(request: NextRequest) {
  const locale = getLocaleFromReferer(request);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const sessionUserId = getUserIdFromSession(request);
  if (!sessionUserId) {
    // The user signed out mid-flow; nothing to attach to.
    return profileRedirect(request, locale, { link_error: "auth_required" });
  }

  if (error) {
    return profileRedirect(request, locale, { link_error: error });
  }
  if (!code) return profileRedirect(request, locale, { link_error: "missing_code" });

  const storedState = request.cookies.get("oauth_link_state_google")?.value;
  if (!storedState || state !== storedState) {
    return profileRedirect(request, locale, { link_error: "invalid_state" });
  }
  const codeVerifier = request.cookies.get("oauth_link_verifier_google")?.value;
  if (!codeVerifier) return profileRedirect(request, locale, { link_error: "missing_verifier" });

  const cookieUserId = request.cookies.get("oauth_link_user_google")?.value;
  // Defense in depth: state cookie was bound to a user id at init time;
  // require that the still-authenticated session matches.
  if (!cookieUserId || cookieUserId !== sessionUserId) {
    return profileRedirect(request, locale, { link_error: "user_mismatch" });
  }

  try {
    const redirectUri =
      process.env.OAUTH_GOOGLE_LINK_CALLBACK_URL ||
      process.env.OAUTH_GOOGLE_CALLBACK_URL?.replace(
        "/api/v1/auth/oauth/google/callback",
        "/api/v1/auth/oauth/google/link/callback",
      );
    const tokenResponse = await exchangeGoogleCodeForToken({
      code,
      codeVerifier,
      redirectUri: redirectUri ?? "",
    });
    const googleUser = await getGoogleUserInfo(tokenResponse.access_token);
    // B7 review P1-4 — re-check email verification on the link callback.
    // The original sign-in callback enforces this; the link callback was
    // missing it, which would let an attacker link an unverified Google
    // account and gain a permanent backdoor (since the link grants future
    // sign-in via `(provider, provider_account_id)` lookup).
    if (googleUser.verified_email === false || googleUser.email_verified === false) {
      return profileRedirect(request, locale, {
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
        profile: {
          provider: "google",
          provider_account_id: googleUser.id,
          email: googleUser.email,
          name: googleUser.name,
          avatar_url: googleUser.picture ?? null,
        },
      }),
    });

    if (coreRes.status === 409) {
      return profileRedirect(request, locale, { link_error: "already_linked", provider: "google" });
    }
    if (!coreRes.ok) {
      return profileRedirect(request, locale, { link_error: "server_error", provider: "google" });
    }
    return profileRedirect(request, locale, { linked: "google" });
  } catch (err) {
    if (isCoreUpstreamUnreachable(err)) {
      return profileRedirect(request, locale, { link_error: "core_unreachable", provider: "google" });
    }
    return profileRedirect(request, locale, { link_error: "server_error", provider: "google" });
  }
}
