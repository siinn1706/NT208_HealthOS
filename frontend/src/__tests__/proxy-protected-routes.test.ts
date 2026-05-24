/**
 * Regression test: proxy.ts protected-route policy.
 *
 * 1. Globs every page.tsx under app/[locale] at test time.
 * 2. Converts each to its locale-stripped route path.
 * 3. Fails if any discovered route is not listed in the fixture (drift guard).
 * 4. Asserts private routes redirect to login when session cookie is absent.
 * 5. Asserts public routes are not redirected to login.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRIVATE_PATHS, PUBLIC_PATHS } from "./proxy-protected-routes.fixture";
import { SESSION_COOKIE_NAME, META_COOKIE_NAME } from "@/lib/bff-auth-cookie";

// Mock next-intl/middleware so the test never needs a running Next.js server.
vi.mock("next-intl/middleware", () => ({
  default: () => () => NextResponse.next(),
}));

// ── Path conversion helper ────────────────────────────────────────────────────

const ROUTE_GROUP_RE = /^\(.+\)$/;

function filePathToRoute(absolutePath: string): string {
  const localeDir = path.join(process.cwd(), "src/app/[locale]");
  const relative = path.relative(localeDir, absolutePath);
  const segments = relative.split(path.sep).filter((s) => {
    if (ROUTE_GROUP_RE.test(s)) return false; // strip (routeGroup)
    if (s === "page.tsx") return false;
    return true;
  });
  return segments.length === 0 ? "/" : "/" + segments.join("/");
}

function collectPageFiles(): string[] {
  const localeDir = path.join(process.cwd(), "src/app/[locale]");
  if (!fs.existsSync(localeDir)) return [];
  const results: string[] = [];
  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "page.tsx") results.push(full);
    }
  }
  walk(localeDir);
  return results;
}

// ── Request factories ─────────────────────────────────────────────────────────

function makeRequest(routePath: string, locale = "vi", withSession = false): NextRequest {
  const url = `https://example.com/${locale}${routePath === "/" ? "" : routePath}`;
  const headers: Record<string, string> = {};
  if (withSession) {
    headers["cookie"] =
      `${SESSION_COOKIE_NAME}=fake-token; ${META_COOKIE_NAME}=${encodeURIComponent(JSON.stringify({ onboarding_status: "completed" }))}`;
  }
  return new NextRequest(url, { headers });
}

function isLoginRedirect(response: Response, locale: string): boolean {
  if (response.status !== 307 && response.status !== 302) return false;
  const location = response.headers.get("location") ?? "";
  return location.includes(`/${locale}/login`);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("proxy.ts — fixture drift guard", () => {
  const allKnown = new Set<string>([...PRIVATE_PATHS, ...PUBLIC_PATHS]);
  const pageFiles = collectPageFiles();

  it("page.tsx files were found in the tree", () => {
    expect(pageFiles.length).toBeGreaterThan(0);
  });

  for (const file of pageFiles) {
    const route = filePathToRoute(file);
    it(`${route} is classified in the fixture`, () => {
      expect(
        allKnown.has(route),
        `Page "${route}" (from ${path.relative(process.cwd(), file)}) is not classified.\n` +
          `Add it to PRIVATE_PATHS or PUBLIC_PATHS in proxy-protected-routes.fixture.ts`,
      ).toBe(true);
    });
  }
});

describe("proxy.ts — private routes redirect to login without session", () => {
  beforeEach(() => vi.resetModules());

  for (const locale of ["vi", "en"] as const) {
    for (const routePath of PRIVATE_PATHS) {
      // Use a concrete path for dynamic segments to simulate real requests.
      const concretePath = routePath.replace(/\[.*?\]/g, "test-id");
      it(`${locale}${concretePath} → login redirect`, async () => {
        const { default: proxy } = await import("@/proxy");
        const req = makeRequest(concretePath, locale, false);
        const response = proxy(req);
        expect(isLoginRedirect(response, locale)).toBe(true);
      });
    }
  }
});

describe("proxy.ts — public routes are not redirected to login", () => {
  beforeEach(() => vi.resetModules());

  for (const locale of ["vi", "en"] as const) {
    for (const routePath of PUBLIC_PATHS) {
      const concretePath = routePath.replace(/\[.*?\]/g, "test-id");
      it(`${locale}${concretePath} → not a login redirect`, async () => {
        const { default: proxy } = await import("@/proxy");
        const req = makeRequest(concretePath, locale, false);
        const response = proxy(req);
        expect(isLoginRedirect(response, locale)).toBe(false);
      });
    }
  }
});
