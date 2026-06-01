import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { encodeOAuthContext } from "@/lib/oauth/flow-context";
import { REFRESH_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";

const exchangeGoogleCodeForTokenMock = vi.hoisted(() => vi.fn());
const getGoogleUserInfoMock = vi.hoisted(() => vi.fn());
const exchangeGitHubCodeForTokenMock = vi.hoisted(() => vi.fn());
const getGitHubUserInfoMock = vi.hoisted(() => vi.fn());
const getGitHubEmailsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/oauth/google", () => ({
  exchangeGoogleCodeForToken: exchangeGoogleCodeForTokenMock,
  getGoogleUserInfo: getGoogleUserInfoMock,
}));

vi.mock("@/lib/oauth/github", () => ({
  exchangeGitHubCodeForToken: exchangeGitHubCodeForTokenMock,
  getGitHubUserInfo: getGitHubUserInfoMock,
  getGitHubEmails: getGitHubEmailsMock,
}));

function makeRequest(
  url: string,
  cookies: Record<string, string>,
): NextRequest {
  const headers = new Headers();
  headers.set(
    "cookie",
    Object.entries(cookies)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("; "),
  );
  return new NextRequest(url, { headers });
}

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("OAuth callbacks store BFF refresh cookie", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.CORE_API_URL = "http://core.example";
    process.env.BFF_SHARED_SECRET = "shared-secret";
    process.env.OAUTH_GOOGLE_CALLBACK_URL = "http://localhost:3000/api/v1/auth/oauth/google/callback";
    process.env.OAUTH_GITHUB_CALLBACK_URL = "http://localhost:3000/api/v1/auth/oauth/github/callback";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  it("Google callback stores rotated auth cookies from Core token exchange", async () => {
    exchangeGoogleCodeForTokenMock.mockResolvedValue({ access_token: "google-oauth-token" });
    getGoogleUserInfoMock.mockResolvedValue({
      id: "google-user-id",
      email: "google@example.com",
      name: "Google User",
      picture: null,
      verified_email: true,
      email_verified: true,
    });
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          data: {
            access_token: "core-access",
            refresh_token: "core-refresh",
            user_id: "user-1",
            email: "google@example.com",
            username: "google-user",
            display_name: "Google User",
            avatar_url: null,
            onboarding_status: "completed",
          },
        },
        200,
      ),
    );

    const { GET } = await import("@/app/api/v1/auth/oauth/google/callback/route");
    const response = await GET(
      makeRequest(
        "http://localhost:3000/api/v1/auth/oauth/google/callback?code=oauth-code&state=state-123",
        {
          oauth_state_google: "state-123",
          oauth_verifier_google: "verifier-123",
          oauth_context_google: encodeOAuthContext({
            initiatedOrigin: "http://localhost:3000",
            locale: "en",
            postLoginPath: "/dashboard/settings",
            mobileRedirectUri: null,
          }),
        },
      ),
    );

    expect(response.headers.get("location")).toContain("/en/dashboard/settings");
    expect(response.cookies.get(SESSION_COOKIE_NAME)?.value).toBe("core-access");
    expect(response.cookies.get(REFRESH_COOKIE_NAME)?.value).toBe("core-refresh");
  });

  it("GitHub callback stores refresh cookie and redirects onboarding when incomplete", async () => {
    exchangeGitHubCodeForTokenMock.mockResolvedValue({ access_token: "github-oauth-token" });
    getGitHubUserInfoMock.mockResolvedValue({
      id: 1234,
      login: "ghuser",
      name: "GitHub User",
      email: null,
      avatar_url: null,
    });
    getGitHubEmailsMock.mockResolvedValue([
      { email: "github@example.com", primary: true, verified: true },
    ]);
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          data: {
            access_token: "core-access-gh",
            refresh_token: "core-refresh-gh",
            user_id: "user-2",
            email: "github@example.com",
            username: "ghuser",
            display_name: "GitHub User",
            avatar_url: null,
            onboarding_status: "pending",
          },
        },
        200,
      ),
    );

    const { GET } = await import("@/app/api/v1/auth/oauth/github/callback/route");
    const response = await GET(
      makeRequest(
        "http://localhost:3000/api/v1/auth/oauth/github/callback?code=oauth-code&state=state-456",
        {
          oauth_state_github: "state-456",
          oauth_context_github: encodeOAuthContext({
            initiatedOrigin: "http://localhost:3000",
            locale: "en",
            postLoginPath: null,
            mobileRedirectUri: null,
          }),
        },
      ),
    );

    expect(response.headers.get("location")).toContain("/en/onboarding");
    expect(response.cookies.get(SESSION_COOKIE_NAME)?.value).toBe("core-access-gh");
    expect(response.cookies.get(REFRESH_COOKIE_NAME)?.value).toBe("core-refresh-gh");
  });
});
