/**
 * admin-bff-auth.test.ts — Property tests for BFF admin route auth gating.
 *
 * **Property 8: BFF auth gating for admin routes**
 *
 * For all admin BFF routes `r`, when the inbound request has:
 *   - `noCookie`      → 401, Core NOT called
 *   - `invalidCookie` → 401, Core NOT called
 *   - `normalUser`    → 403, Core NOT called
 *   - `adminUser`     → 2xx forwarded, Core WAS called
 *
 * **Validates: Requirements 3.9, 3.10**
 */

import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fc from "fast-check";

// ── Mocks ─────────────────────────────────────────────────────────────────────

/**
 * Mock `requireAdminSession` so we can control what it returns per request
 * state without needing a real Core backend or cookie infrastructure.
 */
vi.mock("@/lib/admin/bff-admin-guard", () => ({
  requireAdminSession: vi.fn(),
}));

/**
 * Mock `coreProxy` so we can track whether it was called and control its
 * return value without making real upstream requests.
 */
const mockCoreProxyFn = vi.fn<[NextRequest, string], Promise<NextResponse>>();
vi.mock("@/lib/core-api-proxy", () => ({
  coreProxy: (...args: [NextRequest, string]) => mockCoreProxyFn(...args),
}));

// ── Static imports of route handlers (after mocks are set up) ─────────────────

import * as bffGuard from "@/lib/admin/bff-admin-guard";
import { GET as overviewGET } from "@/app/api/v1/admin/overview/route";
import { GET as usersGET } from "@/app/api/v1/admin/users/route";
import { GET as plansGET } from "@/app/api/v1/admin/subscription-plans/route";

// ── Request states ────────────────────────────────────────────────────────────

/**
 * Request states used by Property 8.
 *
 * - `noCookie`      — no session cookie → requireAdminSession returns 401
 * - `invalidCookie` — invalid session cookie → requireAdminSession returns 401
 * - `normalUser`    — valid session, not admin → requireAdminSession returns 403
 * - `adminUser`     — valid admin session → requireAdminSession returns null
 */
type RequestState = "noCookie" | "invalidCookie" | "normalUser" | "adminUser";

/** Pre-built short-circuit responses for each non-admin state. */
const AUTH_REQUIRED_401 = NextResponse.json(
  { error: { code: "AUTH_REQUIRED" } },
  { status: 401 },
);
const FORBIDDEN_403 = NextResponse.json(
  { error: { code: "FORBIDDEN" } },
  { status: 403 },
);

/**
 * Configure `requireAdminSession` mock for the given request state.
 * - `noCookie` / `invalidCookie` → returns 401 response
 * - `normalUser` → returns 403 response
 * - `adminUser` → returns null (guard passes)
 */
function setupGuardForState(state: RequestState): void {
  switch (state) {
    case "noCookie":
    case "invalidCookie":
      vi.mocked(bffGuard.requireAdminSession).mockResolvedValue(AUTH_REQUIRED_401);
      break;
    case "normalUser":
      vi.mocked(bffGuard.requireAdminSession).mockResolvedValue(FORBIDDEN_403);
      break;
    case "adminUser":
      vi.mocked(bffGuard.requireAdminSession).mockResolvedValue(null);
      break;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Make a NextRequest for a given BFF admin path. */
function makeAdminRequest(path: string, method = "GET"): NextRequest {
  return new NextRequest(`http://localhost${path}`, { method });
}

// ── Route handlers under test ─────────────────────────────────────────────────

/**
 * The three admin routes tested for Property 8.
 * At least 3 routes are required by the task spec.
 */
const ADMIN_ROUTES: Array<{
  label: string;
  path: string;
  method: string;
  handler: (req: NextRequest) => Promise<NextResponse>;
}> = [
  {
    label: "GET /api/v1/admin/overview",
    path: "/api/v1/admin/overview",
    method: "GET",
    handler: (req) => overviewGET(req),
  },
  {
    label: "GET /api/v1/admin/users",
    path: "/api/v1/admin/users",
    method: "GET",
    handler: (req) => usersGET(req),
  },
  {
    label: "GET /api/v1/admin/subscription-plans",
    path: "/api/v1/admin/subscription-plans",
    method: "GET",
    handler: (req) => plansGET(req),
  },
];

// ── Property 8: BFF auth gating for admin routes ──────────────────────────────

/**
 * **Property 8: BFF auth gating for admin routes**
 *
 * Validates: Requirements 3.9, 3.10
 */
describe("Property 8: BFF auth gating for admin routes", () => {
  beforeEach(() => {
    vi.mocked(bffGuard.requireAdminSession).mockReset();
    mockCoreProxyFn.mockReset();
    // Default coreProxy response: shape satisfies the users route (needs data array + meta)
    mockCoreProxyFn.mockResolvedValue(
      NextResponse.json({ data: [], meta: { page: 1, per_page: 20, total: 0 } }, { status: 200 }),
    );
  });

  // ── noCookie → 401, Core NOT called ────────────────────────────────────────

  it("noCookie: all admin routes return 401 and do NOT call coreProxy", async () => {
    /**
     * For all admin routes, when there is no session cookie,
     * requireAdminSession returns 401 and coreProxy is never called.
     * Validates: Requirement 3.9
     */
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: ADMIN_ROUTES.length - 1 }),
        async (routeIdx) => {
          mockCoreProxyFn.mockClear();
          setupGuardForState("noCookie");

          const route = ADMIN_ROUTES[routeIdx];
          const req = makeAdminRequest(route.path, route.method);
          const response = await route.handler(req);

          expect(response.status).toBe(401);
          expect(mockCoreProxyFn).not.toHaveBeenCalled();
        },
      ),
      { numRuns: ADMIN_ROUTES.length },
    );
  });

  // ── invalidCookie → 401, Core NOT called ───────────────────────────────────

  it("invalidCookie: all admin routes return 401 and do NOT call coreProxy", async () => {
    /**
     * For all admin routes, when the session cookie is invalid,
     * requireAdminSession returns 401 and coreProxy is never called.
     * Validates: Requirement 3.9
     */
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: ADMIN_ROUTES.length - 1 }),
        async (routeIdx) => {
          mockCoreProxyFn.mockClear();
          setupGuardForState("invalidCookie");

          const route = ADMIN_ROUTES[routeIdx];
          const req = makeAdminRequest(route.path, route.method);
          const response = await route.handler(req);

          expect(response.status).toBe(401);
          expect(mockCoreProxyFn).not.toHaveBeenCalled();
        },
      ),
      { numRuns: ADMIN_ROUTES.length },
    );
  });

  // ── normalUser → 403, Core NOT called ──────────────────────────────────────

  it("normalUser: all admin routes return 403 and do NOT call coreProxy", async () => {
    /**
     * For all admin routes, when the session resolves to a Normal_User,
     * requireAdminSession returns 403 and coreProxy is never called.
     * Validates: Requirement 3.10
     */
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: ADMIN_ROUTES.length - 1 }),
        async (routeIdx) => {
          mockCoreProxyFn.mockClear();
          setupGuardForState("normalUser");

          const route = ADMIN_ROUTES[routeIdx];
          const req = makeAdminRequest(route.path, route.method);
          const response = await route.handler(req);

          expect(response.status).toBe(403);
          expect(mockCoreProxyFn).not.toHaveBeenCalled();
        },
      ),
      { numRuns: ADMIN_ROUTES.length },
    );
  });

  // ── adminUser → 2xx forwarded, Core WAS called ─────────────────────────────

  it("adminUser: all admin routes forward to coreProxy and return 2xx", async () => {
    /**
     * For all admin routes, when the session resolves to an Admin_User,
     * requireAdminSession returns null and coreProxy is called exactly once,
     * returning a 2xx response.
     * Validates: Requirements 3.9, 3.10
     */
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: ADMIN_ROUTES.length - 1 }),
        async (routeIdx) => {
          mockCoreProxyFn.mockClear();
          setupGuardForState("adminUser");

          const route = ADMIN_ROUTES[routeIdx];
          const req = makeAdminRequest(route.path, route.method);
          const response = await route.handler(req);

          // coreProxy was called (Core WAS reached)
          expect(mockCoreProxyFn).toHaveBeenCalledOnce();
          // Response is 2xx
          expect(response.status).toBeGreaterThanOrEqual(200);
          expect(response.status).toBeLessThan(300);
        },
      ),
      { numRuns: ADMIN_ROUTES.length },
    );
  });

  // ── Example tests: deterministic per-route checks ──────────────────────────

  describe("example tests — deterministic per-route checks", () => {
    for (let i = 0; i < ADMIN_ROUTES.length; i++) {
      const routeIdx = i;
      const route = ADMIN_ROUTES[routeIdx];

      describe(route.label, () => {
        it("noCookie → 401, coreProxy not called", async () => {
          setupGuardForState("noCookie");
          const req = makeAdminRequest(route.path, route.method);
          const response = await route.handler(req);
          expect(response.status).toBe(401);
          expect(mockCoreProxyFn).not.toHaveBeenCalled();
        });

        it("invalidCookie → 401, coreProxy not called", async () => {
          setupGuardForState("invalidCookie");
          const req = makeAdminRequest(route.path, route.method);
          const response = await route.handler(req);
          expect(response.status).toBe(401);
          expect(mockCoreProxyFn).not.toHaveBeenCalled();
        });

        it("normalUser → 403, coreProxy not called", async () => {
          setupGuardForState("normalUser");
          const req = makeAdminRequest(route.path, route.method);
          const response = await route.handler(req);
          expect(response.status).toBe(403);
          expect(mockCoreProxyFn).not.toHaveBeenCalled();
        });

        it("adminUser → 2xx, coreProxy called once", async () => {
          setupGuardForState("adminUser");
          const req = makeAdminRequest(route.path, route.method);
          const response = await route.handler(req);
          expect(mockCoreProxyFn).toHaveBeenCalledOnce();
          expect(response.status).toBeGreaterThanOrEqual(200);
          expect(response.status).toBeLessThan(300);
        });
      });
    }
  });
});
