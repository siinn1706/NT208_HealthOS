/**
 * GitHub OAuth 2.0 helper functions
 * Implements authorization code flow
 */

// ─── Constants ───────────────────────────────────────────────────────────────────
const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_API_URL = "https://api.github.com";

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface GitHubUserInfo {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}

export interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

// ─── Get Authorization URL ───────────────────────────────────────────────────
export function getGitHubAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(GITHUB_AUTH_URL);

  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", "user:email read:user");
  url.searchParams.set("state", params.state);

  return url.toString();
}

// ─── Exchange Code for Token ──────────────────────────────────────────────────
export async function exchangeGitHubCodeForToken(params: {
  code: string;
  redirectUri: string;
}): Promise<GitHubTokenResponse> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth credentials not configured");
  }

  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error_description || "Failed to exchange GitHub code");
  }

  return res.json();
}

// ─── Get User Info ────────────────────────────────────────────────────────────
export async function getGitHubUserInfo(accessToken: string): Promise<GitHubUserInfo> {
  const res = await fetch(`${GITHUB_API_URL}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to get GitHub user info");
  }

  return res.json();
}

// ─── Get User Emails ─────────────────────────────────────────────────────────
export async function getGitHubEmails(accessToken: string): Promise<GitHubEmail[]> {
  const res = await fetch(`${GITHUB_API_URL}/user/emails`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!res.ok) {
    return [];
  }

  const emails: GitHubEmail[] = await res.json();
  return emails.filter((e) => e.verified);
}
