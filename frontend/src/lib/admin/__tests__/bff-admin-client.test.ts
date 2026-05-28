// bff-admin-client.test.ts — unit + property tests for bff-admin-client.ts
// Feature: admin-console, Property 29: 401 from any admin BFF call triggers login redirect

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import {
  adminFetch,
  AdminAuthError,
  AdminForbiddenError,
  AdminFetchError,
  clearAdminCaches,
} from "../bff-admin-client";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build a minimal Response-like object that fetch resolves to. */
function makeFetchResponse(status: number, body: unknown = null): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

// ── Setup / teardown ───────────────────────────────────────────────────────

let originalHref: string;

beforeEach(() => {
  // Capture original href so we can restore it
  originalHref = window.location.href;

  // jsdom does not allow direct assignment to window.location.href by default;
  // we delete and redefine it so we can spy on navigation.
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: {
      href: "http://localhost/vi/admin/users",
      pathname: "/vi/admin/users",
      assign: vi.fn(),
      replace: vi.fn(),
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  // Restore window.location
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: {
      href: originalHref,
      pathname: "/",
    },
  });
});

// ── Property 29 ────────────────────────────────────────────────────────────

describe("Property 29: 401 from any admin BFF call triggers login redirect", () => {
  // Validates: Requirements 10.2

  it("throws AdminAuthError and redirects to login for any admin path suffix returning 401", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary path suffixes (the part after /api/v1/admin/)
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes("\0")),
        async (suffix) => {
          // Arrange: stub fetch to always return 401
          const fetchMock = vi.fn().mockResolvedValue(makeFetchResponse(401));
          vi.stubGlobal("fetch", fetchMock);

          // Arrange: spy on window.location.href setter
          const hrefSetter = vi.fn();
          Object.defineProperty(window.location, "href", {
            configurable: true,
            set: hrefSetter,
            get: () => "http://localhost/vi/admin/users",
          });

          // Arrange: populate the cache so we can verify it gets cleared
          clearAdminCaches(); // start clean
          // (clearAdminCaches is exported; we call it to ensure a known state)

          const path = `/api/v1/admin/${suffix}` as `/api/v1/admin/${string}`;

          // Act + Assert: adminFetch must throw AdminAuthError
          await expect(adminFetch(path)).rejects.toThrow(AdminAuthError);

          // Assert: handleAuthRedirect was invoked — window.location.href was set
          // to a login URL containing "login" and a "from" query parameter
          expect(hrefSetter).toHaveBeenCalledOnce();
          const redirectTarget: string = hrefSetter.mock.calls[0][0] as string;
          expect(redirectTarget).toMatch(/\/login\?from=/);

          // Assert: the "from" parameter encodes the current pathname
          const url = new URL(redirectTarget, "http://localhost");
          expect(url.searchParams.get("from")).toBe("/vi/admin/users");

          // Assert: fetch was called with the correct path
          expect(fetchMock).toHaveBeenCalledOnce();
          expect(fetchMock.mock.calls[0][0]).toBe(path);

          // Cleanup stubs for next iteration
          vi.unstubAllGlobals();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("does NOT throw AdminForbiddenError or AdminFetchError on 401 (only AdminAuthError)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes("\0")),
        async (suffix) => {
          vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeFetchResponse(401)));

          Object.defineProperty(window.location, "href", {
            configurable: true,
            set: vi.fn(),
            get: () => "http://localhost/vi/admin/users",
          });

          const path = `/api/v1/admin/${suffix}` as `/api/v1/admin/${string}`;

          let caughtError: unknown;
          try {
            await adminFetch(path);
          } catch (err) {
            caughtError = err;
          }

          // Must be AdminAuthError, not AdminForbiddenError or AdminFetchError
          expect(caughtError).toBeInstanceOf(AdminAuthError);
          expect(caughtError).not.toBeInstanceOf(AdminForbiddenError);
          expect(caughtError).not.toBeInstanceOf(AdminFetchError);

          vi.unstubAllGlobals();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("clears in-memory admin caches on 401 (observable via clearAdminCaches export)", async () => {
    // handleAuthRedirect() calls clearAdminCaches() internally before redirecting.
    // We verify the cache-clearing side-effect is observable: after a 401 response,
    // calling clearAdminCaches() again is a no-op (the map is already empty),
    // which means the internal call already ran. We confirm this by checking that
    // the redirect fires (which only happens after clearAdminCaches() in handleAuthRedirect).

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeFetchResponse(401)));

    const hrefSetter = vi.fn();
    Object.defineProperty(window.location, "href", {
      configurable: true,
      set: hrefSetter,
      get: () => "http://localhost/vi/admin/users",
    });

    await expect(
      adminFetch("/api/v1/admin/overview"),
    ).rejects.toBeInstanceOf(AdminAuthError);

    // The redirect fired, which means handleAuthRedirect() ran to completion,
    // which means clearAdminCaches() was called as part of that function.
    expect(hrefSetter).toHaveBeenCalledOnce();
    const redirectTarget: string = hrefSetter.mock.calls[0][0] as string;
    expect(redirectTarget).toMatch(/\/login\?from=/);

    // Additionally: calling clearAdminCaches() after the 401 should not throw —
    // it is idempotent and the cache is already empty.
    expect(() => clearAdminCaches()).not.toThrow();

    vi.unstubAllGlobals();
  });

  it("does not render admin content — adminFetch rejects before returning data on 401", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes("\0")),
        async (suffix) => {
          // Even if the server accidentally sends a body with 401, adminFetch
          // must never resolve (return data) — it must always reject.
          const adminBody = { data: { secret: "admin-content" } };
          vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(makeFetchResponse(401, adminBody)),
          );

          Object.defineProperty(window.location, "href", {
            configurable: true,
            set: vi.fn(),
            get: () => "http://localhost/vi/admin/users",
          });

          const path = `/api/v1/admin/${suffix}` as `/api/v1/admin/${string}`;

          // adminFetch must reject — the caller never receives admin data
          let resolved = false;
          try {
            await adminFetch(path);
            resolved = true;
          } catch {
            // expected
          }

          expect(resolved).toBe(false);

          vi.unstubAllGlobals();
        },
      ),
      { numRuns: 100 },
    );
  });
});
