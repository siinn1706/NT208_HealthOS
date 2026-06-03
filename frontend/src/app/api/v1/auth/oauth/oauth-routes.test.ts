import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as googleInit } from "@/app/api/v1/auth/oauth/google/route";
import { GET as githubInit } from "@/app/api/v1/auth/oauth/github/route";
import { GET as googleCallback } from "@/app/api/v1/auth/oauth/google/callback/route";
import { GET as githubCallback } from "@/app/api/v1/auth/oauth/github/callback/route";
import { GET as githubLinkCallback } from "@/app/api/v1/auth/oauth/github/link/callback/route";
import {
  decodeOAuthContext,
  encodeOAuthContext,
} from "@/lib/oauth/flow-context";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";
import * as googleOAuth from "@/lib/oauth/google";
import * as githubOAuth from "@/lib/oauth/github";

function makeRequest(
  url: string,
  opts: {
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
  } = {},
) {
  const headers = new Headers(opts.headers);
  if (opts.cookies && Object.keys(opts.cookies).length > 0) {
    headers.set(
      "cookie",
      Object.entries(opts.cookies)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("; "),
    );
  }
  return new NextRequest(url, { headers });
}

function makeSessionToken(userId: string) {
  const payload = Buffer.from(JSON.stringify({ sub: userId }), "utf-8").toString(
    "base64url",
  );
  return `header.${payload}.signature`;
}

function makeUnsignedIdToken(payload: Record<string, unknown>) {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  return `header.${encodedPayload}.signature`;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const mobileState = "a".repeat(64);
const mobileCodeChallenge = "c".repeat(64);
const mobileAppLinkRedirectUri = "https://app.example.com/auth/oauth/mobile-callback";

describe("OAuth route handlers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
    process.env.GITHUB_CLIENT_ID = "github-client-id";
    process.env.GITHUB_CLIENT_SECRET = "github-client-secret";
    process.env.OAUTH_GOOGLE_CALLBACK_URL =
      "http://localhost:3000/api/v1/auth/oauth/google/callback";
    process.env.OAUTH_GITHUB_CALLBACK_URL =
      "http://localhost:3000/api/v1/auth/oauth/github/callback";
    process.env.BFF_SHARED_SECRET = "test-bff-secret";
    delete process.env.MOBILE_OAUTH_REDIRECT_URIS;
  });

  it("builds a Google redirect_uri from the forwarded tunnel origin", async () => {
    const response = await googleInit(
      makeRequest(
        "http://localhost:3000/api/v1/auth/oauth/google?locale=vi&from=%2Fdashboard%2Fsettings",
        {
          headers: {
            host: "localhost:3000",
            "x-forwarded-host": "healthos-dev.example.com",
            "x-forwarded-proto": "https",
          },
        },
      ),
    );

    const authUrl = new URL(response.headers.get("location") ?? "");
    const context = decodeOAuthContext(
      response.cookies.get("oauth_context_google")?.value ?? null,
    );

    expect(response.status).toBe(302);
    expect(authUrl.searchParams.get("redirect_uri")).toBe(
      "https://healthos-dev.example.com/api/v1/auth/oauth/google/callback",
    );
    expect(context).toEqual({
      initiatedOrigin: "https://healthos-dev.example.com",
      locale: "vi",
      postLoginPath: "/dashboard/settings",
      mobileRedirectUri: null,
    });
  });

  it("keeps localhost GitHub OAuth callbacks on localhost", async () => {
    const response = await githubInit(
      makeRequest(
        "http://localhost:3000/api/v1/auth/oauth/github?locale=en",
        {
          headers: {
            host: "localhost:3000",
          },
        },
      ),
    );

    const authUrl = new URL(response.headers.get("location") ?? "");
    const context = decodeOAuthContext(
      response.cookies.get("oauth_context_github")?.value ?? null,
    );

    expect(response.status).toBe(302);
    expect(authUrl.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/v1/auth/oauth/github/callback",
    );
    expect(context).toEqual({
      initiatedOrigin: "http://localhost:3000",
      locale: "en",
      postLoginPath: null,
      mobileRedirectUri: null,
    });
  });

  it("keeps an allowed mobile OAuth redirect URI in the context", async () => {
    const response = await googleInit(
      makeRequest(
        `http://localhost:3000/api/v1/auth/oauth/google?mobile_redirect_uri=nt208%3A%2F%2Fauth%2Foauth%2Fcallback&mobile_state=${mobileState}&mobile_code_challenge=${mobileCodeChallenge}`,
        {
          headers: {
            host: "localhost:3000",
          },
        },
      ),
    );

    const context = decodeOAuthContext(
      response.cookies.get("oauth_context_google")?.value ?? null,
    );

    expect(context).toEqual({
      initiatedOrigin: "http://localhost:3000",
      locale: "vi",
      postLoginPath: null,
      mobileRedirectUri: "nt208://auth/oauth/callback",
    });
    expect(response.cookies.get("oauth_mobile_state_google")?.value).toBe(mobileState);
    expect(response.cookies.get("oauth_mobile_code_challenge_google")?.value).toBe(mobileCodeChallenge);
  });

  it("keeps an allowlisted HTTPS Android App Link mobile OAuth redirect URI in the context", async () => {
    const appLinkRedirectUri = "https://app.example.com/auth/oauth/mobile-callback";
    process.env.MOBILE_OAUTH_REDIRECT_URIS = `nt208://auth/oauth/callback,${appLinkRedirectUri}`;

    const response = await googleInit(
      makeRequest(
        `http://localhost:3000/api/v1/auth/oauth/google?mobile_redirect_uri=${encodeURIComponent(appLinkRedirectUri)}&mobile_state=${mobileState}&mobile_code_challenge=${mobileCodeChallenge}`,
        {
          headers: {
            host: "localhost:3000",
          },
        },
      ),
    );

    const context = decodeOAuthContext(
      response.cookies.get("oauth_context_google")?.value ?? null,
    );

    expect(context?.mobileRedirectUri).toBe(appLinkRedirectUri);
    expect(response.cookies.get("oauth_mobile_state_google")?.value).toBe(mobileState);
    expect(response.cookies.get("oauth_mobile_code_challenge_google")?.value).toBe(mobileCodeChallenge);
  });

  it("rejects mobile OAuth start when the app verifier challenge is missing", async () => {
    const response = await googleInit(
      makeRequest(
        "http://localhost:3000/api/v1/auth/oauth/google?mobile_redirect_uri=nt208%3A%2F%2Fauth%2Foauth%2Fcallback",
        {
          headers: {
            host: "localhost:3000",
          },
        },
      ),
    );

    expect(response.status).toBe(400);
  });

  it("redirects mobile OAuth config errors back to the app callback", async () => {
    delete process.env.GOOGLE_CLIENT_SECRET;

    const response = await googleInit(
      makeRequest(
        `http://localhost:3000/api/v1/auth/oauth/google?mobile_redirect_uri=nt208%3A%2F%2Fauth%2Foauth%2Fcallback&mobile_state=${mobileState}&mobile_code_challenge=${mobileCodeChallenge}`,
        {
          headers: {
            host: "localhost:3000",
          },
        },
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      `nt208://auth/oauth/callback?provider=google&error=oauth_not_configured&state=${mobileState}`,
    );
  });

  it("redirects web OAuth config errors back to the localized login page", async () => {
    delete process.env.GITHUB_CLIENT_ID;

    const response = await githubInit(
      makeRequest(
        "http://localhost:3000/api/v1/auth/oauth/github?locale=en",
        {
          headers: {
            host: "localhost:3000",
          },
        },
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/en/login?oauth_error=oauth_not_configured",
    );
  });

  it("keeps explicit JSON OAuth config errors for API callers", async () => {
    delete process.env.GITHUB_CLIENT_SECRET;

    const response = await githubInit(
      makeRequest(
        "http://localhost:3000/api/v1/auth/oauth/github",
        {
          headers: {
            accept: "application/json",
            host: "localhost:3000",
          },
        },
      ),
    );

    await expect(response.json()).resolves.toEqual({ error: "GitHub OAuth not configured" });
    expect(response.status).toBe(503);
  });

  it("drops unsafe mobile OAuth redirect URIs", async () => {
    const response = await githubInit(
      makeRequest(
        "http://localhost:3000/api/v1/auth/oauth/github?mobile_redirect_uri=https%3A%2F%2Fevil.example%2Fcallback",
        {
          headers: {
            host: "localhost:3000",
          },
        },
      ),
    );

    const context = decodeOAuthContext(
      response.cookies.get("oauth_context_github")?.value ?? null,
    );

    expect(context?.mobileRedirectUri).toBeNull();
  });

  it("redirects Google callback errors back to the tunnel origin and locale from context", async () => {
    const response = await googleCallback(
      makeRequest(
        "https://healthos-dev.example.com/api/v1/auth/oauth/google/callback?code=oauth-code&state=wrong-state",
        {
          cookies: {
            oauth_context_google: encodeOAuthContext({
              initiatedOrigin: "https://healthos-dev.example.com",
              locale: "vi",
              postLoginPath: "/dashboard",
              mobileRedirectUri: null,
            }),
            oauth_state_google: "expected-state",
            oauth_verifier_google: "verifier",
          },
        },
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://healthos-dev.example.com/vi/login?oauth_error=invalid_state",
    );
  });

  it("redirects mobile Google callback state failures back to the app", async () => {
    const response = await googleCallback(
      makeRequest(
        "http://localhost:3000/api/v1/auth/oauth/google/callback?code=oauth-code&state=wrong-state",
        {
          cookies: {
            oauth_context_google: encodeOAuthContext({
              initiatedOrigin: "http://localhost:3000",
              locale: "vi",
              postLoginPath: null,
              mobileRedirectUri: "nt208://auth/oauth/callback",
            }),
            oauth_state_google: "expected-state",
            oauth_mobile_state_google: mobileState,
            oauth_mobile_code_challenge_google: mobileCodeChallenge,
            oauth_verifier_google: "verifier",
          },
        },
      ),
    );

    expect(response.headers.get("location")).toBe(
      `nt208://auth/oauth/callback?provider=google&error=invalid_state&state=${mobileState}`,
    );
  });

  it("redirects mobile GitHub missing-code failures back to the app", async () => {
    const response = await githubCallback(
      makeRequest(
        "http://localhost:3000/api/v1/auth/oauth/github/callback?state=expected-state",
        {
          cookies: {
            oauth_context_github: encodeOAuthContext({
              initiatedOrigin: "http://localhost:3000",
              locale: "vi",
              postLoginPath: null,
              mobileRedirectUri: "nt208://auth/oauth/callback",
            }),
            oauth_state_github: "expected-state",
            oauth_mobile_state_github: mobileState,
            oauth_mobile_code_challenge_github: mobileCodeChallenge,
          },
        },
      ),
    );

    expect(response.headers.get("location")).toBe(
      `nt208://auth/oauth/callback?provider=github&error=missing_code&state=${mobileState}`,
    );
  });

  it("redirects GitHub link callback failures to the tunnel profile page without using Referer", async () => {
    const response = await githubLinkCallback(
      makeRequest(
        "https://healthos-dev.example.com/api/v1/auth/oauth/github/link/callback?code=oauth-code&state=expected-state",
        {
          cookies: {
            oauth_link_context_github: encodeOAuthContext({
              initiatedOrigin: "https://healthos-dev.example.com",
              locale: "vi",
              postLoginPath: "/dashboard/profile",
              mobileRedirectUri: null,
            }),
            oauth_link_state_github: "expected-state",
            oauth_link_user_github: "user-from-init",
            [SESSION_COOKIE_NAME]: makeSessionToken("current-session-user"),
          },
        },
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://healthos-dev.example.com/vi/dashboard/profile?link_error=user_mismatch",
    );
  });

  it("sends X-BFF-Secret header in Google OAuth callback token exchange", async () => {
    vi.spyOn(googleOAuth, "exchangeGoogleCodeForToken").mockResolvedValue({
      access_token: "provider-access-token",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "email profile",
    });
    vi.spyOn(googleOAuth, "getGoogleUserInfo").mockResolvedValue({
      id: "google-user-id",
      email: "google@example.com",
      name: "Google User",
      verified_email: true,
    });
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse(
        {
          data: {
            access_token: "core-access-token",
            onboarding_status: "completed",
          },
        },
        200,
      ),
    );

    await googleCallback(
      makeRequest(
        "http://localhost:3000/api/v1/auth/oauth/google/callback?code=oauth-code&state=expected-state",
        {
          cookies: {
            oauth_context_google: encodeOAuthContext({
              initiatedOrigin: "http://localhost:3000",
              locale: "en",
              postLoginPath: "/dashboard",
              mobileRedirectUri: null,
            }),
            oauth_state_google: "expected-state",
            oauth_verifier_google: "pkce-verifier",
          },
        },
      ),
    );

    const call = fetchSpy.mock.calls.find(([url]) =>
      String(url).endsWith("/v1/auth/token"),
    );
    expect(call).toBeDefined();
    const init = call?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)["X-BFF-Secret"]).toBe(
      "test-bff-secret",
    );
    const body = JSON.parse(String(init.body));
    expect(body.exchange_issuer).toBe("healthos-bff");
    expect(body.exchange_audience).toBe("healthos-core");
    expect(body.exchange_nonce).toMatch(/^[a-f0-9]{48}$/);
    expect(body.exchange_signature).toMatch(/^[a-f0-9]{64}$/);
  });

  it("redirects mobile Google OAuth callbacks with a one-time handoff code", async () => {
    vi.spyOn(googleOAuth, "exchangeGoogleCodeForToken").mockResolvedValue({
      access_token: "provider-access-token",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "email profile",
    });
    vi.spyOn(googleOAuth, "getGoogleUserInfo").mockResolvedValue({
      id: "google-user-id",
      email: "google@example.com",
      name: "Google User",
      verified_email: true,
    });
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse({ data: { code: "handoff-code", expires_in_seconds: 300 } }, 200),
    );

    const response = await googleCallback(
      makeRequest(
        "http://localhost:3000/api/v1/auth/oauth/google/callback?code=oauth-code&state=expected-state",
        {
          cookies: {
            oauth_context_google: encodeOAuthContext({
              initiatedOrigin: "http://localhost:3000",
              locale: "en",
              postLoginPath: "/dashboard",
              mobileRedirectUri: "nt208://auth/oauth/callback",
            }),
            oauth_state_google: "expected-state",
            oauth_mobile_state_google: mobileState,
            oauth_mobile_code_challenge_google: mobileCodeChallenge,
            oauth_verifier_google: "pkce-verifier",
          },
        },
      ),
    );

    expect(response.headers.get("location")).toBe(
      `nt208://auth/oauth/callback?provider=google&code=handoff-code&state=${mobileState}`,
    );
    expect(String(fetchSpy.mock.calls[0][0])).toMatch(/\/v1\/auth\/mobile-oauth\/handoff$/);
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toMatchObject({
      mobile_state: mobileState,
      mobile_code_challenge: mobileCodeChallenge,
    });
    expect(fetchSpy.mock.calls.some(([url]) => String(url).endsWith("/v1/auth/token"))).toBe(false);
  });

  it("redirects mobile Google App Link callbacks with a one-time handoff code", async () => {
    process.env.MOBILE_OAUTH_REDIRECT_URIS = `nt208://auth/oauth/callback,${mobileAppLinkRedirectUri}`;
    vi.spyOn(googleOAuth, "exchangeGoogleCodeForToken").mockResolvedValue({
      access_token: "provider-access-token",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "email profile",
    });
    vi.spyOn(googleOAuth, "getGoogleUserInfo").mockResolvedValue({
      id: "google-user-id",
      email: "google@example.com",
      name: "Google User",
      verified_email: true,
    });
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse({ data: { code: "handoff-code", expires_in_seconds: 300 } }, 200),
    );

    const response = await googleCallback(
      makeRequest(
        "http://localhost:3000/api/v1/auth/oauth/google/callback?code=oauth-code&state=expected-state",
        {
          cookies: {
            oauth_context_google: encodeOAuthContext({
              initiatedOrigin: "http://localhost:3000",
              locale: "en",
              postLoginPath: "/dashboard",
              mobileRedirectUri: mobileAppLinkRedirectUri,
            }),
            oauth_state_google: "expected-state",
            oauth_mobile_state_google: mobileState,
            oauth_mobile_code_challenge_google: mobileCodeChallenge,
            oauth_verifier_google: "pkce-verifier",
          },
        },
      ),
    );

    expect(response.headers.get("location")).toBe(
      `${mobileAppLinkRedirectUri}?provider=google&code=handoff-code&state=${mobileState}`,
    );
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toMatchObject({
      mobile_state: mobileState,
      mobile_code_challenge: mobileCodeChallenge,
    });
  });

  it("rejects mobile Google handoff when the BFF verifier challenge cookie is missing", async () => {
    vi.spyOn(googleOAuth, "exchangeGoogleCodeForToken").mockResolvedValue({
      access_token: "provider-access-token",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "email profile",
    });
    vi.spyOn(googleOAuth, "getGoogleUserInfo").mockResolvedValue({
      id: "google-user-id",
      email: "google@example.com",
      name: "Google User",
      verified_email: true,
    });
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse({ data: { code: "handoff-code", expires_in_seconds: 300 } }, 200),
    );

    const response = await googleCallback(
      makeRequest(
        "http://localhost:3000/api/v1/auth/oauth/google/callback?code=oauth-code&state=expected-state",
        {
          cookies: {
            oauth_context_google: encodeOAuthContext({
              initiatedOrigin: "http://localhost:3000",
              locale: "en",
              postLoginPath: "/dashboard",
              mobileRedirectUri: "nt208://auth/oauth/callback",
            }),
            oauth_state_google: "expected-state",
            oauth_verifier_google: "pkce-verifier",
            oauth_mobile_state_google: mobileState,
          },
        },
      ),
    );

    expect(response.headers.get("location")).toBe(
      `nt208://auth/oauth/callback?provider=google&error=mobile_verifier_missing&state=${mobileState}`,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("redirects mobile Google App Link verifier errors with state", async () => {
    process.env.MOBILE_OAUTH_REDIRECT_URIS = `nt208://auth/oauth/callback,${mobileAppLinkRedirectUri}`;
    vi.spyOn(googleOAuth, "exchangeGoogleCodeForToken").mockResolvedValue({
      access_token: "provider-access-token",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "email profile",
    });
    vi.spyOn(googleOAuth, "getGoogleUserInfo").mockResolvedValue({
      id: "google-user-id",
      email: "google@example.com",
      name: "Google User",
      verified_email: true,
    });
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse({ data: { code: "handoff-code", expires_in_seconds: 300 } }, 200),
    );

    const response = await googleCallback(
      makeRequest(
        "http://localhost:3000/api/v1/auth/oauth/google/callback?code=oauth-code&state=expected-state",
        {
          cookies: {
            oauth_context_google: encodeOAuthContext({
              initiatedOrigin: "http://localhost:3000",
              locale: "en",
              postLoginPath: "/dashboard",
              mobileRedirectUri: mobileAppLinkRedirectUri,
            }),
            oauth_state_google: "expected-state",
            oauth_verifier_google: "pkce-verifier",
            oauth_mobile_state_google: mobileState,
          },
        },
      ),
    );

    expect(response.headers.get("location")).toBe(
      `${mobileAppLinkRedirectUri}?provider=google&error=mobile_verifier_missing&state=${mobileState}`,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects Google OAuth callback when the unverified nonce payload mismatches", async () => {
    vi.spyOn(googleOAuth, "exchangeGoogleCodeForToken").mockResolvedValue({
      access_token: "provider-access-token",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "email profile",
      id_token: makeUnsignedIdToken({ nonce: "wrong-nonce" }),
    });
    const userInfoSpy = vi.spyOn(googleOAuth, "getGoogleUserInfo").mockResolvedValue({
      id: "google-user-id",
      email: "google@example.com",
      name: "Google User",
      verified_email: true,
    });

    const response = await googleCallback(
      makeRequest(
        "http://localhost:3000/api/v1/auth/oauth/google/callback?code=oauth-code&state=expected-state",
        {
          cookies: {
            oauth_context_google: encodeOAuthContext({
              initiatedOrigin: "http://localhost:3000",
              locale: "en",
              postLoginPath: "/dashboard",
              mobileRedirectUri: null,
            }),
            oauth_state_google: "expected-state",
            oauth_verifier_google: "pkce-verifier",
            oauth_nonce_google: "expected-nonce",
          },
        },
      ),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/en/login?oauth_error=nonce_mismatch",
    );
    expect(userInfoSpy).not.toHaveBeenCalled();
  });

  it("continues Google OAuth callback when id_token cannot be decoded for nonce", async () => {
    vi.spyOn(googleOAuth, "exchangeGoogleCodeForToken").mockResolvedValue({
      access_token: "provider-access-token",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "email profile",
      id_token: "malformed-token",
    });
    vi.spyOn(googleOAuth, "getGoogleUserInfo").mockResolvedValue({
      id: "google-user-id",
      email: "google@example.com",
      name: "Google User",
      verified_email: true,
    });
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse(
        {
          data: {
            access_token: "core-access-token",
            onboarding_status: "completed",
          },
        },
        200,
      ),
    );

    const response = await googleCallback(
      makeRequest(
        "http://localhost:3000/api/v1/auth/oauth/google/callback?code=oauth-code&state=expected-state",
        {
          cookies: {
            oauth_context_google: encodeOAuthContext({
              initiatedOrigin: "http://localhost:3000",
              locale: "en",
              postLoginPath: "/dashboard",
              mobileRedirectUri: null,
            }),
            oauth_state_google: "expected-state",
            oauth_verifier_google: "pkce-verifier",
            oauth_nonce_google: "expected-nonce",
          },
        },
      ),
    );

    expect(fetchSpy).toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost:3000/en/dashboard");
  });

  it("sends X-BFF-Secret header in GitHub OAuth callback token exchange", async () => {
    vi.spyOn(githubOAuth, "exchangeGitHubCodeForToken").mockResolvedValue({
      access_token: "provider-access-token",
      token_type: "bearer",
      scope: "read:user user:email",
    });
    vi.spyOn(githubOAuth, "getGitHubUserInfo").mockResolvedValue({
      id: 42,
      login: "gh-user",
      name: "GitHub User",
      email: "github@example.com",
      avatar_url: "https://example.com/avatar.png",
    });
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse(
        {
          data: {
            access_token: "core-access-token",
            onboarding_status: "completed",
          },
        },
        200,
      ),
    );

    await githubCallback(
      makeRequest(
        "http://localhost:3000/api/v1/auth/oauth/github/callback?code=oauth-code&state=expected-state",
        {
          cookies: {
            oauth_context_github: encodeOAuthContext({
              initiatedOrigin: "http://localhost:3000",
              locale: "en",
              postLoginPath: "/dashboard",
              mobileRedirectUri: null,
            }),
            oauth_state_github: "expected-state",
          },
        },
      ),
    );

    const call = fetchSpy.mock.calls.find(([url]) =>
      String(url).endsWith("/v1/auth/token"),
    );
    expect(call).toBeDefined();
    const init = call?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)["X-BFF-Secret"]).toBe(
      "test-bff-secret",
    );
    const body = JSON.parse(String(init.body));
    expect(body.exchange_issuer).toBe("healthos-bff");
    expect(body.exchange_audience).toBe("healthos-core");
    expect(body.exchange_nonce).toMatch(/^[a-f0-9]{48}$/);
    expect(body.exchange_signature).toMatch(/^[a-f0-9]{64}$/);
  });

  it("redirects mobile GitHub OAuth callbacks with a one-time handoff code", async () => {
    vi.spyOn(githubOAuth, "exchangeGitHubCodeForToken").mockResolvedValue({
      access_token: "provider-access-token",
      token_type: "bearer",
      scope: "read:user user:email",
    });
    vi.spyOn(githubOAuth, "getGitHubUserInfo").mockResolvedValue({
      id: 42,
      login: "gh-user",
      name: "GitHub User",
      email: "github@example.com",
      avatar_url: "https://example.com/avatar.png",
    });
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse({ data: { code: "github-handoff-code", expires_in_seconds: 300 } }, 200),
    );

    const response = await githubCallback(
      makeRequest(
        "http://localhost:3000/api/v1/auth/oauth/github/callback?code=oauth-code&state=expected-state",
        {
          cookies: {
            oauth_context_github: encodeOAuthContext({
              initiatedOrigin: "http://localhost:3000",
              locale: "en",
              postLoginPath: "/dashboard",
              mobileRedirectUri: "nt208://auth/oauth/callback",
            }),
            oauth_state_github: "expected-state",
            oauth_mobile_state_github: mobileState,
            oauth_mobile_code_challenge_github: mobileCodeChallenge,
          },
        },
      ),
    );

    expect(response.headers.get("location")).toBe(
      `nt208://auth/oauth/callback?provider=github&code=github-handoff-code&state=${mobileState}`,
    );
    expect(String(fetchSpy.mock.calls[0][0])).toMatch(/\/v1\/auth\/mobile-oauth\/handoff$/);
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toMatchObject({
      mobile_state: mobileState,
      mobile_code_challenge: mobileCodeChallenge,
    });
    expect(fetchSpy.mock.calls.some(([url]) => String(url).endsWith("/v1/auth/token"))).toBe(false);
  });

  it("redirects mobile GitHub App Link callbacks with a one-time handoff code", async () => {
    process.env.MOBILE_OAUTH_REDIRECT_URIS = `nt208://auth/oauth/callback,${mobileAppLinkRedirectUri}`;
    vi.spyOn(githubOAuth, "exchangeGitHubCodeForToken").mockResolvedValue({
      access_token: "provider-access-token",
      token_type: "bearer",
      scope: "read:user user:email",
    });
    vi.spyOn(githubOAuth, "getGitHubUserInfo").mockResolvedValue({
      id: 42,
      login: "gh-user",
      name: "GitHub User",
      email: "github@example.com",
      avatar_url: "https://example.com/avatar.png",
    });
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse({ data: { code: "github-handoff-code", expires_in_seconds: 300 } }, 200),
    );

    const response = await githubCallback(
      makeRequest(
        "http://localhost:3000/api/v1/auth/oauth/github/callback?code=oauth-code&state=expected-state",
        {
          cookies: {
            oauth_context_github: encodeOAuthContext({
              initiatedOrigin: "http://localhost:3000",
              locale: "en",
              postLoginPath: "/dashboard",
              mobileRedirectUri: mobileAppLinkRedirectUri,
            }),
            oauth_state_github: "expected-state",
            oauth_mobile_state_github: mobileState,
            oauth_mobile_code_challenge_github: mobileCodeChallenge,
          },
        },
      ),
    );

    expect(response.headers.get("location")).toBe(
      `${mobileAppLinkRedirectUri}?provider=github&code=github-handoff-code&state=${mobileState}`,
    );
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toMatchObject({
      mobile_state: mobileState,
      mobile_code_challenge: mobileCodeChallenge,
    });
  });
});
