/**
 * GitHub OAuth — link callback (B7 P3).
 *
 * Mirrors `/google/link/callback` but uses GitHub's email-list endpoint to
 * pick a verified primary email before posting to Core's
 * `/v1/auth/oauth/links/attach`.
 */
import { NextRequest, NextResponse } from "next/server";
import { exchangeGitHubCodeForToken, getGitHubEmails, getGitHubUserInfo } from "@/lib/oauth/github";
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
    "oauth_link_state_github",
    "oauth_link_user_github",
    "oauth_link_context_github",
  ]);
  return res;
}

export async function GET(request: NextRequest) {
  const context = readOAuthContext(request, "github", "link", [
    process.env.OAUTH_GITHUB_LINK_CALLBACK_URL,
    process.env.OAUTH_GITHUB_CALLBACK_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const sessionUserId = getUserIdFromSession(request);
  if (!sessionUserId) return profileRedirect(context, { link_error: "auth_required" });

  if (error) return profileRedirect(context, { link_error: error });
  if (!code) return profileRedirect(context, { link_error: "missing_code" });

  const storedState = request.cookies.get("oauth_link_state_github")?.value;
  if (!storedState || state !== storedState) {
    return profileRedirect(context, { link_error: "invalid_state" });
  }
  const cookieUserId = request.cookies.get("oauth_link_user_github")?.value;
  if (!cookieUserId || cookieUserId !== sessionUserId) {
    return profileRedirect(context, { link_error: "user_mismatch" });
  }

  try {
    const redirectUri = buildOAuthCallbackUrlFromContext(
      context,
      request,
      "/api/v1/auth/oauth/github/link/callback",
      [
        process.env.OAUTH_GITHUB_LINK_CALLBACK_URL,
        process.env.OAUTH_GITHUB_CALLBACK_URL,
        process.env.NEXT_PUBLIC_APP_URL,
      ],
    );
    const tokenResponse = await exchangeGitHubCodeForToken({ code, redirectUri });
    const githubUser = await getGitHubUserInfo(tokenResponse.access_token);

    let primaryEmail = githubUser.email;
    if (!primaryEmail) {
      const emails = await getGitHubEmails(tokenResponse.access_token);
      const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
      primaryEmail = primary?.email;
    }
    if (!primaryEmail) {
      return profileRedirect(context, { link_error: "no_verified_email", provider: "github" });
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
          provider: "github",
          provider_account_id: String(githubUser.id),
          email: primaryEmail,
          name: githubUser.name ?? githubUser.login,
          avatar_url: githubUser.avatar_url ?? null,
        }),
      }),
    });

    if (coreRes.status === 409) {
      return profileRedirect(context, { link_error: "already_linked", provider: "github" });
    }
    if (!coreRes.ok) {
      return profileRedirect(context, { link_error: "server_error", provider: "github" });
    }
    return profileRedirect(context, { linked: "github" });
  } catch (err) {
    if (isCoreUpstreamUnreachable(err)) {
      return profileRedirect(context, { link_error: "core_unreachable", provider: "github" });
    }
    return profileRedirect(context, { link_error: "server_error", provider: "github" });
  }
}
