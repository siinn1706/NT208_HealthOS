/**
 * GitHub OAuth callback handler
 * Validates state, exchanges code for token, gets user info, creates session
 */
import { NextRequest, NextResponse } from "next/server";
import { exchangeGitHubCodeForToken, getGitHubUserInfo, getGitHubEmails } from "@/lib/oauth/github";
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
    console.error("GitHub OAuth error:", error, errorDescription);
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
  const storedState = request.cookies.get("oauth_state_github")?.value;
  if (!storedState || state !== storedState) {
    console.error("Invalid OAuth state");
    return NextResponse.redirect(
      new URL(`/${locale}/login?oauth_error=invalid_state`, request.url).toString()
    );
  }

  // ─── Exchange Code for Token ────────────────────────────────────────────────
  try {
    const redirectUri = process.env.OAUTH_GITHUB_CALLBACK_URL!;
    const tokenResponse = await exchangeGitHubCodeForToken({
      code,
      redirectUri,
    });

    // ─── Get User Info ─────────────────────────────────────────────────────────
    const githubUser = await getGitHubUserInfo(tokenResponse.access_token);

    // GitHub may not return email, try to get from emails endpoint
    let email = githubUser.email;
    if (!email) {
      const emails = await getGitHubEmails(tokenResponse.access_token);
      const primaryEmail = emails.find((e) => e.primary);
      email = primaryEmail?.email ?? emails[0]?.email;
    }

    if (!email) {
      throw new Error("GitHub email not available");
    }

    // ─── Call Core BE to Create/Retrieve User ────────────────────────────────
    const coreRes = await fetch(`${CORE_API_URL}/v1/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BFF-Secret": process.env.BFF_SHARED_SECRET ?? "",
      },
      body: JSON.stringify({
        provider: "github",
        provider_account_id: String(githubUser.id),
        email,
        name: githubUser.name ?? githubUser.login,
        avatar_url: githubUser.avatar_url ?? null,
      }),
    });

    if (!coreRes.ok) {
      const coreError = await coreRes.json().catch(() => ({}));
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

    // Meta cookie (non-httpOnly — carries onboarding_status for src/proxy.ts)
    response.cookies.set(
      META_COOKIE_NAME,
      JSON.stringify({ onboarding_status: onboardingStatus }),
      { httpOnly: false, secure: SESSION_COOKIE_SECURE, sameSite: "lax", maxAge: SESSION_COOKIE_MAX_AGE, path: "/" }
    );

    // Clear temporary OAuth cookies
    response.cookies.delete("oauth_state_github");

    return response;
  } catch (err) {
    console.error("GitHub OAuth callback error:", err);
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
