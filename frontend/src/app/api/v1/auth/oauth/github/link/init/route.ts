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
import { getLocaleFromReferer } from "@/lib/locale-path";

const COOKIE_MAX_AGE = 600;

export async function GET(request: NextRequest) {
  const locale = getLocaleFromReferer(request);
  const userId = getUserIdFromSession(request);
  if (!userId) {
    return NextResponse.redirect(
      new URL(`/${locale}/login?from=/dashboard/profile`, request.url).toString(),
    );
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri =
    process.env.OAUTH_GITHUB_LINK_CALLBACK_URL ||
    process.env.OAUTH_GITHUB_CALLBACK_URL?.replace(
      "/api/v1/auth/oauth/github/callback",
      "/api/v1/auth/oauth/github/link/callback",
    );

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "GitHub OAuth not configured" }, { status: 503 });
  }

  const state = generateState();
  const authUrl = getGitHubAuthUrl({ clientId, redirectUri, state });

  const response = NextResponse.redirect(authUrl, 302);
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
  response.cookies.set("oauth_link_state_github", state, opts);
  response.cookies.set("oauth_link_user_github", userId, opts);
  return response;
}
