import { describe, it, expect } from "vitest";
import { getSafePostLoginRedirectPath } from "@/lib/safe-post-login-redirect";

/**
 * Regression suite for the post-login double-locale-redirect bug
 * (plans/post-login-double-locale-redirect/plan.md).
 *
 * Critical contract: callers hand the returned value to next-intl's
 * `router.push(...)`, which auto-prefixes the active locale. The helper MUST
 * therefore return the locale-stripped path; returning the raw `/vi/...` would
 * double-prefix into `/vi/vi/...` → 404.
 */
describe("getSafePostLoginRedirectPath", () => {
  describe("strips locale prefix (the C1 fix)", () => {
    it("returns unprefixed path for /vi/dashboard/anything", () => {
      expect(getSafePostLoginRedirectPath("/vi/dashboard/profile")).toBe(
        "/dashboard/profile",
      );
      expect(getSafePostLoginRedirectPath("/vi/dashboard")).toBe("/dashboard");
      expect(getSafePostLoginRedirectPath("/vi/dashboard/settings/devices")).toBe(
        "/dashboard/settings/devices",
      );
    });

    it("returns unprefixed path for /en/dashboard/anything", () => {
      expect(getSafePostLoginRedirectPath("/en/dashboard/reports")).toBe(
        "/dashboard/reports",
      );
    });

    it("preserves query string", () => {
      expect(
        getSafePostLoginRedirectPath("/vi/dashboard/settings?tab=security"),
      ).toBe("/dashboard/settings?tab=security");
    });

    it("preserves dashboard path with no locale prefix", () => {
      expect(getSafePostLoginRedirectPath("/dashboard/profile")).toBe(
        "/dashboard/profile",
      );
    });
  });

  describe("rejects unsafe input", () => {
    it("rejects null / empty", () => {
      expect(getSafePostLoginRedirectPath(null)).toBeNull();
      expect(getSafePostLoginRedirectPath("")).toBeNull();
    });

    it("rejects scheme-relative URLs (//evil.com)", () => {
      expect(getSafePostLoginRedirectPath("//evil.com/dashboard")).toBeNull();
    });

    it("rejects absolute URLs", () => {
      expect(
        getSafePostLoginRedirectPath("https://evil.com/dashboard"),
      ).toBeNull();
      expect(
        getSafePostLoginRedirectPath("http://localhost:3000/dashboard"),
      ).toBeNull();
    });

    it("rejects path traversal", () => {
      expect(
        getSafePostLoginRedirectPath("/vi/../etc/passwd"),
      ).toBeNull();
      expect(
        getSafePostLoginRedirectPath("/dashboard/../../../etc/passwd"),
      ).toBeNull();
    });

    it("rejects backslash (windows path separator)", () => {
      expect(getSafePostLoginRedirectPath("/dashboard\\foo")).toBeNull();
    });

    it("rejects null byte injection", () => {
      expect(getSafePostLoginRedirectPath("/dashboard\u0000foo")).toBeNull();
    });

    it("rejects non-dashboard routes", () => {
      // Logged-in users shouldn't be sent back to /login or arbitrary pages.
      expect(getSafePostLoginRedirectPath("/login")).toBeNull();
      expect(getSafePostLoginRedirectPath("/vi/login")).toBeNull();
      expect(getSafePostLoginRedirectPath("/vi/onboarding")).toBeNull();
      expect(getSafePostLoginRedirectPath("/")).toBeNull();
      expect(getSafePostLoginRedirectPath("/vi")).toBeNull();
    });
  });

  describe("does not mis-strip path segments that begin with a locale code", () => {
    // LOCALE_PREFIX_RE is anchored to `^/(vi|en)(?=/|$)` so /vienna stays as
    // /vienna rather than getting strip-mangled to "enna". Today the safety
    // net is `isSafeDashboardPath` rejecting non-/dashboard paths anyway, but
    // this hardens the regex itself for any future use.
    it("does not strip /vienna or /english as if they were locale prefixes", () => {
      // Both fail isSafeDashboardPath but that's the point — they must not
      // first get mangled to "/nna" or "/lish".
      expect(getSafePostLoginRedirectPath("/vienna")).toBeNull();
      expect(getSafePostLoginRedirectPath("/english")).toBeNull();
    });
  });
});
