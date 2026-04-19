/**
 * GitHub OAuth — link callback (B7 P3).
 *
 * Mirrors `/google/link/callback` but uses GitHub's email-list endpoint to
 * pick a verified primary email before posting to Core's
 * `/v1/auth/oauth/links/attach`.
 */
import { NextRequest, NextResponse } from "next/server";
import { exchangeGitHubCodeForToken, getGitHubEmails, getGitHubUserInfo } from "@/lib/oauth/github";
import { getLocaleFromReferer } from "@/lib/locale-path";
import { getUserIdFromSession } from "@/lib/oauth/session-helpers";
import { CORE_API_URL } from "@/lib/env";
import { isCoreUpstreamUnreachable } from "@/lib/core-upstream-errors";

function profileRedirect(request: NextRequest, locale: string, params: Record<string, string>): NextResponse {
  const url = new URL(`/${locale}/dashboard/profile`, request.url);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = NextResponse.redirect(url.toString());
  ["oauth_link_state_github", "oauth_link_user_github"].forEach((name) => res.cookies.delete(name));
  return res;
}

export async function GET(request: NextRequest) {
  const locale = getLocaleFromReferer(request);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const sessionUserId = getUserIdFromSession(request);
  if (!sessionUserId) return profileRedirect(request, locale, { link_error: "auth_required" });

  if (error) return profileRedirect(request, locale, { link_error: error });
  if (!code) return profileRedirect(request, locale, { link_error: "missing_code" });

  const storedState = request.cookies.get("oauth_link_state_github")?.value;
  if (!storedState || state !== storedState) {
    return profileRedirect(request, locale, { link_error: "invalid_state" });
  }
  const cookieUserId = request.cookies.get("oauth_link_user_github")?.value;
  if (!cookieUserId || cookieUserId !== sessionUserId) {
    return profileRedirect(request, locale, { link_error: "user_mismatch" });
  }

  try {
    const redirectUri =
      process.env.OAUTH_GITHUB_LINK_CALLBACK_URL ||
      process.env.OAUTH_GITHUB_CALLBACK_URL?.replace(
        "/api/v1/auth/oauth/github/callback",
        "/api/v1/auth/oauth/github/link/callback",
      );
    const tokenResponse = await exchangeGitHubCodeForToken({ code, redirectUri: redirectUri ?? "" });
    const githubUser = await getGitHubUserInfo(tokenResponse.access_token);

    let primaryEmail = githubUser.email;
    if (!primaryEmail) {
      const emails = await getGitHubEmails(tokenResponse.access_token);
      const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
      primaryEmail = primary?.email;
    }
    if (!primaryEmail) {
      return profileRedirect(request, locale, { link_error: "no_verified_email", provider: "github" });
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
          provider: "github",
          provider_account_id: String(githubUser.id),
          email: primaryEmail,
          name: githubUser.name ?? githubUser.login,
          avatar_url: githubUser.avatar_url ?? null,
        },
      }),
    });

    if (coreRes.status === 409) {
      return profileRedirect(request, locale, { link_error: "already_linked", provider: "github" });
    }
    if (!coreRes.ok) {
      return profileRedirect(request, locale, { link_error: "server_error", provider: "github" });
    }
    return profileRedirect(request, locale, { linked: "github" });
  } catch (err) {
    if (isCoreUpstreamUnreachable(err)) {
      return profileRedirect(request, locale, { link_error: "core_unreachable", provider: "github" });
    }
    return profileRedirect(request, locale, { link_error: "server_error", provider: "github" });
  }
}
