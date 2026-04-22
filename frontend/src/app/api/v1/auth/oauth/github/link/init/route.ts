/**
 * GitHub OAuth — link initiation (B7 P3).
 *
 * Authenticated entry point for "Settings → Linked Accounts → Add GitHub".
 * Stores intent + user binding in dedicated `link_*` cookies so the sign-in
 * flow's cookies cannot be confused with link cookies.
 */
import { NextRequest, NextResponse } from "next/server";
import { generateState } from "@/lib/oauth/pkce";
import { getGitHubAuthUrl } from "@/lib/oauth/github";
import { getUserIdFromSession } from "@/lib/oauth/session-helpers";
import {
  buildLocalizedAppUrl,
  buildOAuthCallbackUrl,
  createOAuthContext,
  getOAuthCookieOptions,
  setOAuthContextCookie,
} from "@/lib/oauth/flow-context";

const COOKIE_MAX_AGE = 600;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? request.cookies.get("NEXT_LOCALE")?.value;
  const context = createOAuthContext(
    request,
    {
      locale,
      postLoginPath: url.searchParams.get("from") ?? "/dashboard/profile",
    },
    [process.env.OAUTH_GITHUB_LINK_CALLBACK_URL, process.env.OAUTH_GITHUB_CALLBACK_URL, process.env.NEXT_PUBLIC_APP_URL],
  );
  const userId = getUserIdFromSession(request);
  if (!userId) {
    return NextResponse.redirect(
      buildLocalizedAppUrl(context, "/login", { from: "/dashboard/profile" }),
    );
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = buildOAuthCallbackUrl(
    request,
    "/api/v1/auth/oauth/github/link/callback",
    [
      process.env.OAUTH_GITHUB_LINK_CALLBACK_URL,
      process.env.OAUTH_GITHUB_CALLBACK_URL,
      process.env.NEXT_PUBLIC_APP_URL,
    ],
  );

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "GitHub OAuth not configured" }, { status: 503 });
  }

  const state = generateState();
  const authUrl = getGitHubAuthUrl({ clientId, redirectUri, state });

  const response = NextResponse.redirect(authUrl, 302);
  const opts = getOAuthCookieOptions(request, COOKIE_MAX_AGE);
  response.cookies.set("oauth_link_state_github", state, opts);
  response.cookies.set("oauth_link_user_github", userId, opts);
  setOAuthContextCookie(response, request, "github", "link", context, COOKIE_MAX_AGE);
  return response;
}
