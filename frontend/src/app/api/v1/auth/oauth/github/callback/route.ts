/**
 * GitHub OAuth callback handler
 * Validates state, exchanges code for token, gets user info, creates session
 */
import { NextRequest, NextResponse } from "next/server";
import { exchangeGitHubCodeForToken, getGitHubUserInfo, getGitHubEmails } from "@/lib/oauth/github";
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

function withGitHubCookieCleanup(response: NextResponse): NextResponse {
  clearOAuthCookies(response, [
    "oauth_state_github",
    "oauth_context_github",
  ]);
  return response;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const context = readOAuthContext(request, "github", "signin", [
    process.env.OAUTH_GITHUB_CALLBACK_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]);

  // ─── Handle OAuth Errors ────────────────────────────────────────────────────
  if (error) {
    console.error("GitHub OAuth error:", error, errorDescription);
    return withGitHubCookieCleanup(
      NextResponse.redirect(
        buildLocalizedAppUrl(context, "/login", {
          oauth_error: errorDescription || error,
        }),
      ),
    );
  }

  // ─── Validate Required Parameters ───────────────────────────────────────────
  if (!code) {
    return withGitHubCookieCleanup(
      NextResponse.redirect(
        buildLocalizedAppUrl(context, "/login", { oauth_error: "missing_code" }),
      ),
    );
  }

  // ─── Validate State (CSRF Protection) ──────────────────────────────────────
  const storedState = request.cookies.get("oauth_state_github")?.value;
  if (!storedState || state !== storedState) {
    console.error("Invalid OAuth state");
    return withGitHubCookieCleanup(
      NextResponse.redirect(
        buildLocalizedAppUrl(context, "/login", { oauth_error: "invalid_state" }),
      ),
    );
  }

  // ─── Exchange Code for Token ────────────────────────────────────────────────
  try {
    const redirectUri = buildOAuthCallbackUrlFromContext(
      context,
      request,
      "/api/v1/auth/oauth/github/callback",
      [process.env.OAUTH_GITHUB_CALLBACK_URL, process.env.NEXT_PUBLIC_APP_URL],
    );
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
      body: JSON.stringify(buildSignedBffOAuthProfile({
        provider: "github",
        provider_account_id: String(githubUser.id),
        email,
        name: githubUser.name ?? githubUser.login,
        avatar_url: githubUser.avatar_url ?? null,
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
        return withGitHubCookieCleanup(
          NextResponse.redirect(
            buildLocalizedAppUrl(context, "/login", {
              restore: "pending",
              provider: "github",
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
    return withGitHubCookieCleanup(response);
  } catch (err) {
    console.error("GitHub OAuth callback error:", err);
    if (isCoreUpstreamUnreachable(err)) {
      console.error(
        `Core BE unreachable at ${CORE_API_URL}. Start the API (see README) or fix CORE_API_URL in frontend/.env.local.`
      );
      return withGitHubCookieCleanup(
        NextResponse.redirect(
          buildLocalizedAppUrl(context, "/login", {
            oauth_error: "core_unreachable",
          }),
        ),
      );
    }
    return withGitHubCookieCleanup(
      NextResponse.redirect(
        buildLocalizedAppUrl(context, "/login", {
          oauth_error: "server_error",
        }),
      ),
    );
  }
}
