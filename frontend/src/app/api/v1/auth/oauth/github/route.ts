/**
 * GitHub OAuth initiation endpoint
 * Generates state, redirects to GitHub
 */
import { NextResponse } from "next/server";
import { generateState } from "@/lib/oauth/pkce";
import { getGitHubAuthUrl } from "@/lib/oauth/github";

const COOKIE_MAX_AGE = 600; // 10 minutes

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = process.env.OAUTH_GITHUB_CALLBACK_URL;

  // Check if OAuth is configured
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: "GitHub OAuth not configured" },
      { status: 503 }
    );
  }

  try {
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

    // Store state in httpOnly cookie
    response.cookies.set("oauth_state_github", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("GitHub OAuth initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth" },
      { status: 500 }
    );
  }
}
