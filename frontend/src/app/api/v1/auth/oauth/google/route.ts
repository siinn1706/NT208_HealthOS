/**
 * Google OAuth initiation endpoint
 * Generates PKCE code verifier/challenge and state, redirects to Google
 */
import { NextRequest, NextResponse } from "next/server";
import { generateCodeVerifier, generateCodeChallenge, generateState, generateNonce } from "@/lib/oauth/pkce";
import { getGoogleAuthUrl } from "@/lib/oauth/google";
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

function googleNotConfiguredResponse(
  request: NextRequest,
  context: ReturnType<typeof createOAuthContext>,
  mobileState: string | null,
): NextResponse {
  if (wantsJsonResponse(request)) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 503 });
  }
  if (context.mobileRedirectUri && mobileState) {
    return NextResponse.redirect(
      buildMobileOAuthRedirectUrl(
        { ...context, mobileRedirectUri: context.mobileRedirectUri },
        { provider: "google", error: "oauth_not_configured", state: mobileState },
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
    [process.env.OAUTH_GOOGLE_CALLBACK_URL, process.env.NEXT_PUBLIC_APP_URL],
  );
  const mobileState = normalizeOAuthMobileState(url.searchParams.get("mobile_state"));
  const mobileCodeChallenge = normalizeOAuthMobileCodeChallenge(url.searchParams.get("mobile_code_challenge"));
  if (context.mobileRedirectUri && (!mobileState || !mobileCodeChallenge)) {
    return NextResponse.json(
      { error: "Missing or invalid mobile OAuth verifier challenge" },
      { status: 400 },
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return googleNotConfiguredResponse(request, context, mobileState);
  }

  try {
    const redirectUri = buildOAuthCallbackUrl(
      request,
      "/api/v1/auth/oauth/google/callback",
      [process.env.OAUTH_GOOGLE_CALLBACK_URL, process.env.NEXT_PUBLIC_APP_URL],
    );
    // Generate PKCE parameters
    const codeVerifier = await generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();
    const nonce = generateNonce();

    // Build Google authorization URL
    const authUrl = getGoogleAuthUrl({
      clientId,
      redirectUri,
      codeChallenge,
      state,
      nonce,
    });

    // Create redirect response
    const response = NextResponse.redirect(authUrl, 302);
    const cookieOptions = getOAuthCookieOptions(request, COOKIE_MAX_AGE);

    // Store PKCE verifier and state in httpOnly cookies
    response.cookies.set("oauth_state_google", state, cookieOptions);

    response.cookies.set("oauth_verifier_google", codeVerifier, cookieOptions);

    response.cookies.set("oauth_nonce_google", nonce, cookieOptions);
    if (context.mobileRedirectUri && mobileState) {
      response.cookies.set("oauth_mobile_state_google", mobileState, cookieOptions);
    }
    if (context.mobileRedirectUri && mobileCodeChallenge) {
      response.cookies.set("oauth_mobile_code_challenge_google", mobileCodeChallenge, cookieOptions);
    }
    setOAuthContextCookie(response, request, "google", "signin", context, COOKIE_MAX_AGE);

    return response;
  } catch (error) {
    console.error("Google OAuth initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth" },
      { status: 500 }
    );
  }
}
