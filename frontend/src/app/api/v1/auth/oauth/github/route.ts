/**
 * GitHub OAuth initiation endpoint
 * Generates state, redirects to GitHub
 */
import { NextRequest, NextResponse } from "next/server";
import { generateState } from "@/lib/oauth/pkce";
import { getGitHubAuthUrl } from "@/lib/oauth/github";
import {
  buildOAuthCallbackUrl,
  createOAuthContext,
  getOAuthCookieOptions,
  setOAuthContextCookie,
} from "@/lib/oauth/flow-context";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/bff-rate-limit";

const COOKIE_MAX_AGE = 600; // 10 minutes

export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, RATE_LIMITS["auth:oauth_start"]);
  if (limited) return limited;

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  // Check if OAuth is configured
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "GitHub OAuth not configured" },
      { status: 503 }
    );
  }

  try {
    const url = new URL(request.url);
    const redirectUri = buildOAuthCallbackUrl(
      request,
      "/api/v1/auth/oauth/github/callback",
      [process.env.OAUTH_GITHUB_CALLBACK_URL, process.env.NEXT_PUBLIC_APP_URL],
    );
    const context = createOAuthContext(
      request,
      {
        locale: url.searchParams.get("locale") ?? request.cookies.get("NEXT_LOCALE")?.value,
        postLoginPath: url.searchParams.get("from"),
      },
      [process.env.OAUTH_GITHUB_CALLBACK_URL, process.env.NEXT_PUBLIC_APP_URL],
    );
    // Generate state for CSRF protection
    const state = generateState();

    // Build GitHub authorization URL
    const authUrl = getGitHubAuthUrl({
      clientId,
      redirectUri,
      state,
    });

    // Create redirect response
    const response = NextResponse.redirect(authUrl, 302);
    const cookieOptions = getOAuthCookieOptions(request, COOKIE_MAX_AGE);

    // Store state in httpOnly cookie
    response.cookies.set("oauth_state_github", state, cookieOptions);
    setOAuthContextCookie(response, request, "github", "signin", context, COOKIE_MAX_AGE);

    return response;
  } catch (error) {
    console.error("GitHub OAuth initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth" },
      { status: 500 }
    );
  }
}
