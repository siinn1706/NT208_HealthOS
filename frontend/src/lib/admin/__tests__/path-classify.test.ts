// path-classify.test.ts — unit + property tests for path-classify.ts
// Tests implemented in tasks 6.3–6.5
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  isAdminPath,
  isDashboardPath,
  buildLoginRedirect,
  isKnownLocale,
  stripLocale,
} from "../path-classify";

// Feature: admin-console, Property 15: Admin path classification is robust to URL noise
describe("Property 15: Admin path classification is robust to URL noise", () => {
  /**
   * Validates: Requirements 5.1, 5.8
   *
   * For all (suffix, trailingSlash, query, fragment) combinations:
   *   - Build pathname = "/admin" + suffix + (trailingSlash ? "/" : "") + (query ? "?foo=1" : "") + (fragment ? "#bar" : "")
   *   - isAdminPath(pathname) returns true iff suffix === "" OR suffix starts with "/"
   *   - Classification is invariant to trailing slash, query, and fragment
   *
   * The suffix generator excludes "?" and "#" characters because those are
   * URL delimiters — they would be interpreted as the start of a query string
   * or fragment rather than as part of the path segment. The task spec
   * models query and fragment noise via the dedicated boolean flags.
   */

  // Arbitrary for a path suffix that contains no URL-delimiter characters
  const pathSuffix = fc.string({ minLength: 0, maxLength: 20 }).filter(
    (s) => !s.includes("?") && !s.includes("#")
  );

  it("classifies admin paths correctly regardless of trailing slash, query, and fragment", () => {
    fc.assert(
      fc.property(
        pathSuffix,
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (suffix, trailingSlash, query, fragment) => {
          const pathname =
            "/admin" +
            suffix +
            (trailingSlash ? "/" : "") +
            (query ? "?foo=1" : "") +
            (fragment ? "#bar" : "");

          const result = isAdminPath(pathname);

          // The path is an admin path iff suffix is "" (exactly "/admin")
          // or suffix starts with "/" (i.e. "/admin/something")
          const shouldBeAdmin = suffix === "" || suffix.startsWith("/");

          expect(result).toBe(shouldBeAdmin);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("classification is invariant to trailing slash", () => {
    fc.assert(
      fc.property(
        pathSuffix,
        (suffix) => {
          // Only test suffixes that produce valid admin paths (empty or starting with "/")
          if (suffix !== "" && !suffix.startsWith("/")) return;

          const withoutSlash = "/admin" + suffix;
          const withSlash = "/admin" + suffix + "/";

          expect(isAdminPath(withoutSlash)).toBe(isAdminPath(withSlash));
        }
      ),
      { numRuns: 100 }
    );
  });

  it("classification is invariant to query string", () => {
    fc.assert(
      fc.property(
        pathSuffix,
        (suffix) => {
          if (suffix !== "" && !suffix.startsWith("/")) return;

          const withoutQuery = "/admin" + suffix;
          const withQuery = "/admin" + suffix + "?foo=1";

          expect(isAdminPath(withoutQuery)).toBe(isAdminPath(withQuery));
        }
      ),
      { numRuns: 100 }
    );
  });

  it("classification is invariant to fragment", () => {
    fc.assert(
      fc.property(
        pathSuffix,
        (suffix) => {
          if (suffix !== "" && !suffix.startsWith("/")) return;

          const withoutFragment = "/admin" + suffix;
          const withFragment = "/admin" + suffix + "#bar";

          expect(isAdminPath(withoutFragment)).toBe(isAdminPath(withFragment));
        }
      ),
      { numRuns: 100 }
    );
  });

  it("non-admin paths are never classified as admin", () => {
    fc.assert(
      fc.property(
        // Generate suffixes that do NOT start with "/" and are not empty,
        // and contain no URL-delimiter characters
        pathSuffix.filter((s) => s.length >= 1 && !s.startsWith("/")),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (suffix, trailingSlash, query, fragment) => {
          const pathname =
            "/admin" +
            suffix +
            (trailingSlash ? "/" : "") +
            (query ? "?foo=1" : "") +
            (fragment ? "#bar" : "");

          // e.g. "/adminXYZ" should NOT be classified as admin
          expect(isAdminPath(pathname)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 16: Unauthenticated redirect target
 *
 * For any (locale, pathname) pair, buildLoginRedirect(locale, pathname)
 * must equal `/${locale}/login?from=${encodeURIComponent(pathname)}`.
 *
 * Validates: Requirements 5.3
 */
describe("buildLoginRedirect", () => {
  it("Property 16: Unauthenticated redirect target", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.string(),
        (locale, pathname) => {
          const result = buildLoginRedirect(locale, pathname);
          const expected = `/${locale}/login?from=${encodeURIComponent(pathname)}`;
          expect(result).toBe(expected);
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Property 17: Admin-on-dashboard redirect target
// Validates: Requirements 5.5
// ---------------------------------------------------------------------------

describe("isDashboardPath — Property 17: Admin-on-dashboard redirect target", () => {
  // -------------------------------------------------------------------------
  // Example tests: paths that MUST return true
  // -------------------------------------------------------------------------
  it("returns true for /dashboard", () => {
    expect(isDashboardPath("/dashboard")).toBe(true);
  });

  it("returns true for /dashboard/ (trailing slash)", () => {
    expect(isDashboardPath("/dashboard/")).toBe(true);
  });

  it("returns true for /dashboard/settings", () => {
    expect(isDashboardPath("/dashboard/settings")).toBe(true);
  });

  it("returns true for /dashboard/settings?foo=1 (with query)", () => {
    expect(isDashboardPath("/dashboard/settings?foo=1")).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Example tests: paths that MUST return false
  // -------------------------------------------------------------------------
  it("returns false for /admin", () => {
    expect(isDashboardPath("/admin")).toBe(false);
  });

  it("returns false for / (root)", () => {
    expect(isDashboardPath("/")).toBe(false);
  });

  it("returns false for /dashboardx (prefix collision)", () => {
    expect(isDashboardPath("/dashboardx")).toBe(false);
  });

  it("returns false for /other", () => {
    expect(isDashboardPath("/other")).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Helper that mirrors the normalise() logic inside path-classify.ts so the
  // test can independently compute the expected result without importing the
  // private helper.
  // -------------------------------------------------------------------------
  function normalise(p: string): string {
    const noFragment = p.split("#")[0];
    const noQuery = noFragment.split("?")[0];
    return noQuery.length > 1 ? noQuery.replace(/\/+$/, "") : noQuery;
  }

  function expectedIsDashboard(p: string): boolean {
    const n = normalise(p);
    return n === "/dashboard" || n.startsWith("/dashboard/");
  }

  // -------------------------------------------------------------------------
  // Property test 17a: any /dashboard path (with optional noise) returns true
  // -------------------------------------------------------------------------
  it("Property 17a: any /dashboard path (with optional noise) returns true", () => {
    // **Validates: Requirements 5.5**
    const dashboardSuffix = fc.oneof(
      // Exact match variants
      fc.constant(""),
      fc.constant("/"),
      // Sub-path variants
      fc.stringMatching(/^\/[a-z0-9/_-]{1,40}/),
      // With query string
      fc.tuple(
        fc.stringMatching(/^\/[a-z0-9/_-]{0,20}/),
        fc.stringMatching(/^[a-z0-9=&]{1,20}/)
      ).map(([path, qs]) => `${path}?${qs}`),
      // With fragment
      fc.tuple(
        fc.stringMatching(/^\/[a-z0-9/_-]{0,20}/),
        fc.stringMatching(/^[a-z0-9]{1,10}/)
      ).map(([path, frag]) => `${path}#${frag}`),
    );

    fc.assert(
      fc.property(dashboardSuffix, (suffix) => {
        const p = `/dashboard${suffix}`;
        return isDashboardPath(p) === expectedIsDashboard(p);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property test 17b: paths that do NOT start with /dashboard return false
  // -------------------------------------------------------------------------
  it("Property 17b: paths that do NOT start with /dashboard return false", () => {
    // **Validates: Requirements 5.5**
    const nonDashboardPath = fc.oneof(
      // Root
      fc.constant("/"),
      // /admin and sub-paths
      fc.stringMatching(/^\/admin(\/[a-z0-9/_-]{0,30})?/),
      // /other arbitrary paths (first segment ≠ "dashboard")
      fc.stringMatching(/^\/[a-ce-z][a-z0-9/_-]{0,30}/),
      // /dashboardX — starts with /dashboard but next char is not "/" or end
      fc.stringMatching(/^\/dashboard[a-z0-9_-][a-z0-9/_-]{0,20}/),
    );

    fc.assert(
      fc.property(nonDashboardPath, (p) => {
        return isDashboardPath(p) === expectedIsDashboard(p);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property test 17c: consistent with the normalise-then-check definition
  // for arbitrary strings
  // -------------------------------------------------------------------------
  it("Property 17c: isDashboardPath is consistent with the normalise-then-check definition for arbitrary strings", () => {
    // **Validates: Requirements 5.5**
    fc.assert(
      fc.property(
        fc.stringMatching(/^\/[!-~]{0,60}/),
        (p) => {
          return isDashboardPath(p) === expectedIsDashboard(p);
        }
      ),
      { numRuns: 100 }
    );
  });
});
