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

function withGitHubCookieCleanup(response: NextResponse): NextResponse {
  clearOAuthCookies(response, [
    "oauth_state_github",
    "oauth_mobile_state_github",
    "oauth_mobile_code_challenge_github",
    "oauth_context_github",
  ]);
  return response;
}

function githubFailureRedirect(
  context: ReturnType<typeof readOAuthContext>,
  error: string,
  webParams: Record<string, string>,
  mobileState?: string | null,
): string {
  return mobileOAuthErrorRedirect(context, "github", error, mobileState) ?? buildLocalizedAppUrl(context, "/login", webParams);
}

// oxlint-disable-next-line react-doctor/nextjs-no-side-effect-in-get-handler -- OAuth providers must callback via GET; state validation plus one-time provider codes guard replay.
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
  const mobileState = normalizeOAuthMobileState(request.cookies.get("oauth_mobile_state_github")?.value);
  const mobileCodeChallenge = normalizeOAuthMobileCodeChallenge(request.cookies.get("oauth_mobile_code_challenge_github")?.value);

  // ─── Handle OAuth Errors ────────────────────────────────────────────────────
  if (error) {
    console.error("GitHub OAuth error:", error, errorDescription);
    return withGitHubCookieCleanup(
      NextResponse.redirect(
        githubFailureRedirect(context, error, {
          oauth_error: errorDescription || error,
        }, mobileState),
      ),
    );
  }

  // ─── Validate Required Parameters ───────────────────────────────────────────
  if (!code) {
    return withGitHubCookieCleanup(
      NextResponse.redirect(
        githubFailureRedirect(context, "missing_code", { oauth_error: "missing_code" }, mobileState),
      ),
    );
  }

  // ─── Validate State (CSRF Protection) ──────────────────────────────────────
  const storedState = request.cookies.get("oauth_state_github")?.value;
  if (!storedState || state !== storedState) {
    console.error("Invalid OAuth state");
    return withGitHubCookieCleanup(
      NextResponse.redirect(
        githubFailureRedirect(context, "invalid_state", { oauth_error: "invalid_state" }, mobileState),
      ),
    );
  }

  if (isMobileOAuthFlow(context) && (!mobileState || !mobileCodeChallenge)) {
    return withGitHubCookieCleanup(
      NextResponse.redirect(
        buildMobileOAuthRedirectUrl(context, {
          provider: "github",
          error: "mobile_verifier_missing",
          ...(mobileState ? { state: mobileState } : {}),
        }),
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

    const signedProfile = buildSignedBffOAuthProfile({
      provider: "github",
      provider_account_id: String(githubUser.id),
      email,
      name: githubUser.name ?? githubUser.login,
      avatar_url: githubUser.avatar_url ?? null,
    });

    if (isMobileOAuthFlow(context)) {
      const callbackState = mobileState;
      const callbackCodeChallenge = mobileCodeChallenge;
      if (!callbackState || !callbackCodeChallenge) {
        return withGitHubCookieCleanup(
          NextResponse.redirect(
            buildMobileOAuthRedirectUrl(context, {
              provider: "github",
              error: "mobile_verifier_missing",
            }),
          ),
        );
      }
      try {
        const handoffCode = await createMobileOAuthHandoffCode(signedProfile, callbackState, callbackCodeChallenge);
        return withGitHubCookieCleanup(
          NextResponse.redirect(
            buildMobileOAuthRedirectUrl(context, {
              provider: "github",
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
          return withGitHubCookieCleanup(
            NextResponse.redirect(
              buildMobileOAuthRedirectUrl(context, {
                provider: "github",
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
    return withGitHubCookieCleanup(response);
  } catch (err) {
    console.error("GitHub OAuth callback error:", err);
    if (isCoreUpstreamUnreachable(err)) {
      console.error(
        `Core BE unreachable at ${CORE_API_URL}. Start the API (see README) or fix CORE_API_URL in frontend/.env.local.`
      );
      return withGitHubCookieCleanup(
        NextResponse.redirect(
          mobileOAuthErrorRedirect(context, "github", "core_unreachable", mobileState)
          ?? buildLocalizedAppUrl(context, "/login", {
              oauth_error: "core_unreachable",
            }),
        ),
      );
    }
    return withGitHubCookieCleanup(
      NextResponse.redirect(
        mobileOAuthErrorRedirect(
          context,
          "github",
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
