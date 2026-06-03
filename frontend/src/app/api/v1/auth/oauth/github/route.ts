/**
 * GitHub OAuth initiation endpoint
 * Generates state, redirects to GitHub
 */
import { NextRequest, NextResponse } from "next/server";
import { generateState } from "@/lib/oauth/pkce";
import { getGitHubAuthUrl } from "@/lib/oauth/github";
import {
  buildLocalizedAppUrl,
  buildOAuthCallbackUrl,
  createOAuthContext,
  getOAuthCookieOptions,
  normalizeOAuthMobileCodeChallenge,
  normalizeOAuthMobileState,
  setOAuthContextCookie,
} from "@/lib/oauth/flow-context";
import { buildMobileOAuthRedirectUrl } from "@/lib/oauth/mobile-handoff";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/bff-rate-limit";

const COOKIE_MAX_AGE = 600; // 10 minutes

function wantsJsonResponse(request: NextRequest): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("application/json") && !accept.includes("text/html");
}

function githubNotConfiguredResponse(
  request: NextRequest,
  context: ReturnType<typeof createOAuthContext>,
  mobileState: string | null,
): NextResponse {
  if (wantsJsonResponse(request)) {
    return NextResponse.json({ error: "GitHub OAuth not configured" }, { status: 503 });
  }
  if (context.mobileRedirectUri && mobileState) {
    return NextResponse.redirect(
      buildMobileOAuthRedirectUrl(
        { ...context, mobileRedirectUri: context.mobileRedirectUri },
        { provider: "github", error: "oauth_not_configured", state: mobileState },
      ),
      302,
    );
  }
  return NextResponse.redirect(
    buildLocalizedAppUrl(context, "/login", { oauth_error: "oauth_not_configured" }),
    302,
  );
}

export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, RATE_LIMITS["auth:oauth_start"]);
  if (limited) return limited;

  const url = new URL(request.url);
  const context = createOAuthContext(
    request,
    {
      locale: url.searchParams.get("locale") ?? request.cookies.get("NEXT_LOCALE")?.value,
      postLoginPath: url.searchParams.get("from"),
      mobileRedirectUri: url.searchParams.get("mobile_redirect_uri"),
    },
    [process.env.OAUTH_GITHUB_CALLBACK_URL, process.env.NEXT_PUBLIC_APP_URL],
  );
  const mobileState = normalizeOAuthMobileState(url.searchParams.get("mobile_state"));
  const mobileCodeChallenge = normalizeOAuthMobileCodeChallenge(url.searchParams.get("mobile_code_challenge"));
  if (context.mobileRedirectUri && (!mobileState || !mobileCodeChallenge)) {
    return NextResponse.json(
      { error: "Missing or invalid mobile OAuth verifier challenge" },
      { status: 400 },
    );
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return githubNotConfiguredResponse(request, context, mobileState);
  }

  try {
    const redirectUri = buildOAuthCallbackUrl(
      request,
      "/api/v1/auth/oauth/github/callback",
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
    if (context.mobileRedirectUri && mobileState) {
      response.cookies.set("oauth_mobile_state_github", mobileState, cookieOptions);
    }
    if (context.mobileRedirectUri && mobileCodeChallenge) {
      response.cookies.set("oauth_mobile_code_challenge_github", mobileCodeChallenge, cookieOptions);
    }
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
