/**
 * proxy-admin.test.ts — Property and example tests for admin proxy guard.
 *
 * Covers:
 *   - Property 18: Admin allow-list pass-through (task 10.5)
 *   - Example tests for admin proxy branches (task 10.6)
 *
 * Validates: Requirements 5.3, 5.4, 5.5, 5.6, 5.8, 12.2, 12.3, 12.4, 12.5
 */
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fc from "fast-check";
import { SESSION_COOKIE_NAME, META_COOKIE_NAME } from "@/lib/bff-auth-cookie";
import { PUBLIC_PATHS, PRIVATE_PATHS } from "./proxy-protected-routes.fixture";
import { routing } from "@/i18n/routing";

// Mock next-intl/middleware so the test never needs a running Next.js server.
vi.mock("next-intl/middleware", () => ({
  default: () => () => NextResponse.next(),
}));

// ── Cookie helpers ────────────────────────────────────────────────────────────

/**
 * Build the cookie header for an Admin_User:
 *   - SESSION_COOKIE_NAME set to a non-empty value
 *   - META_COOKIE_NAME set to JSON with onboarding_status: "completed" and is_admin: true
 */
function adminUserCookies(): string {
  const meta = JSON.stringify({ onboarding_status: "completed", is_admin: true });
  return `${SESSION_COOKIE_NAME}=fake-admin-token; ${META_COOKIE_NAME}=${encodeURIComponent(meta)}`;
}

/**
 * Build the cookie header for a Normal_User (authenticated, not admin).
 */
function normalUserCookies(): string {
  const meta = JSON.stringify({ onboarding_status: "completed", is_admin: false });
  return `${SESSION_COOKIE_NAME}=fake-user-token; ${META_COOKIE_NAME}=${encodeURIComponent(meta)}`;
}

// ── Request factory ───────────────────────────────────────────────────────────

function makeRequest(
  routePath: string,
  locale = "vi",
  cookieHeader?: string,
): NextRequest {
  const url = `https://example.com/${locale}${routePath === "/" ? "" : routePath}`;
  const headers: Record<string, string> = {};
  if (cookieHeader) {
    headers["cookie"] = cookieHeader;
  }
  return new NextRequest(url, { headers });
}

// ── Response classification helpers ──────────────────────────────────────────

function isRedirect(response: Response): boolean {
  return response.status === 307 || response.status === 302 || response.status === 308;
}

function isLoginRedirect(response: Response, locale: string): boolean {
  if (!isRedirect(response)) return false;
  const location = response.headers.get("location") ?? "";
  return location.includes(`/${locale}/login`);
}

function isForbiddenRedirect(response: Response, locale: string): boolean {
  if (!isRedirect(response)) return false;
  const location = response.headers.get("location") ?? "";
  return location.includes(`/${locale}/admin/forbidden`);
}

function isAdminRedirect(response: Response, locale: string): boolean {
  if (!isRedirect(response)) return false;
  const location = response.headers.get("location") ?? "";
  return location.endsWith(`/${locale}/admin`);
}

// ── Auth routes (login, register, etc.) ──────────────────────────────────────
// These are paths that an Admin_User should be able to access without redirect.
const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/verify"];

// ── Admin paths (locale-stripped) ────────────────────────────────────────────
const ADMIN_PATHS = [
  "/admin",
  "/admin/users",
  "/admin/users/test-id",
  "/admin/subscriptions",
  "/admin/forbidden",
];

// ── Property 18: Admin allow-list pass-through ────────────────────────────────

/**
 * **Property 18: Admin allow-list pass-through**
 *
 * For all paths p ∈ (admin paths) ∪ (auth routes) ∪ Route_Fixture.PUBLIC_PATHS
 * under any locale, when an Admin_User targets p, the proxy guard SHALL NOT
 * redirect (i.e., it returns the locale-resolved next response).
 *
 * **Validates: Requirements 5.6**
 */
describe("Property 18: Admin allow-list pass-through", () => {
  beforeEach(() => vi.resetModules());

  it("Admin_User accessing admin paths is NOT redirected", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...ADMIN_PATHS),
        fc.constantFrom(...routing.locales),
        async (adminPath, locale) => {
          const { default: proxy } = await import("@/proxy");
          const req = makeRequest(adminPath, locale, adminUserCookies());
          const response = proxy(req);
          // Must not redirect to login or forbidden
          expect(isLoginRedirect(response, locale)).toBe(false);
          expect(isForbiddenRedirect(response, locale)).toBe(false);
        },
      ),
      { numRuns: ADMIN_PATHS.length * routing.locales.length },
    );
  });

  it("Admin_User accessing auth paths is NOT redirected to login or forbidden", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...AUTH_PATHS),
        fc.constantFrom(...routing.locales),
        async (authPath, locale) => {
          const { default: proxy } = await import("@/proxy");
          const req = makeRequest(authPath, locale, adminUserCookies());
          const response = proxy(req);
          expect(isLoginRedirect(response, locale)).toBe(false);
          expect(isForbiddenRedirect(response, locale)).toBe(false);
        },
      ),
      { numRuns: AUTH_PATHS.length * routing.locales.length },
    );
  });

  it("Admin_User accessing public paths is NOT redirected to login or forbidden", async () => {
    // Filter out dynamic segments — replace with concrete values for the test
    const concretePaths = PUBLIC_PATHS.map((p) =>
      p.replace(/\[.*?\]/g, "test-id"),
    );

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...concretePaths),
        fc.constantFrom(...routing.locales),
        async (publicPath, locale) => {
          const { default: proxy } = await import("@/proxy");
          const req = makeRequest(publicPath, locale, adminUserCookies());
          const response = proxy(req);
          expect(isLoginRedirect(response, locale)).toBe(false);
          expect(isForbiddenRedirect(response, locale)).toBe(false);
        },
      ),
      { numRuns: concretePaths.length * routing.locales.length },
    );
  });

  it("Admin_User on /vi/admin passes through (no redirect)", async () => {
    const { default: proxy } = await import("@/proxy");
    const req = makeRequest("/admin", "vi", adminUserCookies());
    const response = proxy(req);
    expect(isLoginRedirect(response, "vi")).toBe(false);
    expect(isForbiddenRedirect(response, "vi")).toBe(false);
  });

  it("Admin_User on /vi/admin/users passes through (no redirect)", async () => {
    const { default: proxy } = await import("@/proxy");
    const req = makeRequest("/admin/users", "vi", adminUserCookies());
    const response = proxy(req);
    expect(isLoginRedirect(response, "vi")).toBe(false);
    expect(isForbiddenRedirect(response, "vi")).toBe(false);
  });

  it("Admin_User on /vi/admin/subscriptions passes through (no redirect)", async () => {
    const { default: proxy } = await import("@/proxy");
    const req = makeRequest("/admin/subscriptions", "vi", adminUserCookies());
    const response = proxy(req);
    expect(isLoginRedirect(response, "vi")).toBe(false);
    expect(isForbiddenRedirect(response, "vi")).toBe(false);
  });
});

// ── Example tests (task 10.6) ─────────────────────────────────────────────────

describe("proxy.ts — admin example tests", () => {
  beforeEach(() => vi.resetModules());

  // 12.2: Unauthenticated → /{locale}/login?from=...
  it("unauthenticated request to /vi/admin redirects to /vi/login with from param", async () => {
    const { default: proxy } = await import("@/proxy");
    const req = makeRequest("/admin", "vi");
    const response = proxy(req);
    expect(isLoginRedirect(response, "vi")).toBe(true);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("from=");
  });

  // 12.3: Normal_User → /{locale}/admin/forbidden (single deterministic destination)
  it("Normal_User request to /vi/admin redirects to /vi/admin/forbidden", async () => {
    const { default: proxy } = await import("@/proxy");
    const req = makeRequest("/admin", "vi", normalUserCookies());
    const response = proxy(req);
    expect(isForbiddenRedirect(response, "vi")).toBe(true);
  });

  // 12.4: Admin_User → /admin passes through (no redirect)
  it("Admin_User request to /vi/admin passes through without redirect", async () => {
    const { default: proxy } = await import("@/proxy");
    const req = makeRequest("/admin", "vi", adminUserCookies());
    const response = proxy(req);
    expect(isRedirect(response)).toBe(false);
  });

  // 12.5: Admin_User on /dashboard → /{locale}/admin
  it("Admin_User on /vi/dashboard is redirected to /vi/admin", async () => {
    const { default: proxy } = await import("@/proxy");
    const req = makeRequest("/dashboard", "vi", adminUserCookies());
    const response = proxy(req);
    expect(isAdminRedirect(response, "vi")).toBe(true);
  });

  // 5.8: Cookie parse failure treated as unauthenticated
  it("malformed META_COOKIE_NAME is treated as unauthenticated (no admin access)", async () => {
    const { default: proxy } = await import("@/proxy");
    // Valid session cookie but malformed meta cookie (not valid JSON)
    const badCookies = `${SESSION_COOKIE_NAME}=fake-token; ${META_COOKIE_NAME}=not-valid-json`;
    const req = makeRequest("/admin", "vi", badCookies);
    const response = proxy(req);
    // Should redirect to forbidden (has session but is_admin is false due to parse failure)
    expect(isForbiddenRedirect(response, "vi")).toBe(true);
  });

  // Additional: Admin_User on /en/admin passes through
  it("Admin_User request to /en/admin passes through without redirect", async () => {
    const { default: proxy } = await import("@/proxy");
    const req = makeRequest("/admin", "en", adminUserCookies());
    const response = proxy(req);
    expect(isRedirect(response)).toBe(false);
  });
});
