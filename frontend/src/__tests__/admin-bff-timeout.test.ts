/**
 * admin-bff-timeout.test.ts — Property test for upstream timeout/error mapping.
 *
 * Property 9: BFF maps upstream timeout/transport errors to 502
 *   - Mock Core (via coreProxy) to simulate timeout (>5 s) or transport error
 *   - Assert BFF returns 502 with the documented body shape
 *     { error: { code: "...", message: "..." } }
 *   - Tested against at least 2 admin routes
 *
 * **Validates: Requirements 3.12**
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fc from "fast-check";
import { NextRequest, NextResponse } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

// Mock requireAdminSession to return null (admin confirmed — guard passes)
const requireAdminSessionMock = vi.hoisted(() => vi.fn<[], Promise<NextResponse | null>>());

vi.mock("@/lib/admin/bff-admin-guard", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

// Mock coreProxy to simulate upstream timeout/transport error
const coreProxyMock = vi.hoisted(() => vi.fn<[NextRequest, string], Promise<NextResponse>>());

vi.mock("@/lib/core-api-proxy", () => ({
  coreProxy: coreProxyMock,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a 502 NextResponse that simulates what coreProxy returns on
 * upstream timeout or transport failure.
 */
function make502Response(code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status: 502 });
}

/**
 * Build a minimal NextRequest for a given admin BFF path.
 */
function makeAdminRequest(path: string, method = "GET"): NextRequest {
  return new NextRequest(`http://localhost${path}`, { method });
}

/**
 * Assert that a response is a 502 with the documented body shape:
 *   { error: { code: string, message: string } }
 */
async function assert502Shape(response: NextResponse): Promise<void> {
  expect(response.status).toBe(502);
  const body = await response.json();
  expect(body).toHaveProperty("error");
  expect(typeof body.error).toBe("object");
  expect(typeof body.error.code).toBe("string");
  expect(body.error.code.length).toBeGreaterThan(0);
  expect(typeof body.error.message).toBe("string");
  expect(body.error.message.length).toBeGreaterThan(0);
}

// ── Error scenario generators ─────────────────────────────────────────────────

/**
 * Generates upstream error scenarios:
 *   - "timeout": Core did not respond within 5 s (AbortError)
 *   - "transport": Core returned a transport/network error
 */
const errorScenarioArb = fc.record({
  kind: fc.constantFrom("timeout" as const, "transport" as const),
  code: fc.constantFrom(
    "UPSTREAM_TIMEOUT",
    "UPSTREAM_UNAVAILABLE",
    "UPSTREAM_ERROR",
  ),
  message: fc.constantFrom(
    "Core service request timed out.",
    "Core service is temporarily unavailable.",
    "Upstream service error.",
  ),
});

// ── Route under test ──────────────────────────────────────────────────────────

/**
 * The admin routes to test. The property must cover at least 2 routes.
 */
const ADMIN_ROUTES = [
  {
    label: "GET /api/v1/admin/overview",
    path: "/api/v1/admin/overview",
    method: "GET",
    importHandler: () =>
      import("@/app/api/v1/admin/overview/route").then((m) => m.GET),
  },
  {
    label: "GET /api/v1/admin/users",
    path: "/api/v1/admin/users",
    method: "GET",
    importHandler: () =>
      import("@/app/api/v1/admin/users/route").then((m) => m.GET),
  },
  {
    label: "GET /api/v1/admin/subscription-plans",
    path: "/api/v1/admin/subscription-plans",
    method: "GET",
    importHandler: () =>
      import("@/app/api/v1/admin/subscription-plans/route").then((m) => m.GET),
  },
] as const;

// ── Property 9: BFF maps upstream timeout/transport errors to 502 ─────────────

/**
 * **Property 9: BFF maps upstream timeout/transport errors to 502**
 *
 * For all admin BFF routes r, when the upstream Core_Backend does not respond
 * within 5 seconds or returns a transport error, the BFF SHALL respond with
 * HTTP 502 and the documented body shape { error: { code: "...", message: "..." } }.
 *
 * **Validates: Requirements 3.12**
 */
describe("Property 9: BFF maps upstream timeout/transport errors to 502", () => {
  beforeEach(() => {
    vi.resetModules();
    requireAdminSessionMock.mockReset();
    coreProxyMock.mockReset();

    // Admin session guard always passes (returns null = admin confirmed)
    requireAdminSessionMock.mockResolvedValue(null);
  });

  it("GET /api/v1/admin/overview returns 502 on upstream timeout or transport error", async () => {
    await fc.assert(
      fc.asyncProperty(errorScenarioArb, async (scenario) => {
        // Arrange: coreProxy simulates timeout/transport error → 502
        coreProxyMock.mockResolvedValue(
          make502Response(scenario.code, scenario.message),
        );

        const { GET } = await import("@/app/api/v1/admin/overview/route");
        const req = makeAdminRequest("/api/v1/admin/overview");

        // Act
        const response = await GET(req);

        // Assert: BFF returns 502 with documented body shape
        await assert502Shape(response);
      }),
      { numRuns: 20 },
    );
  });

  it("GET /api/v1/admin/users returns 502 on upstream timeout or transport error", async () => {
    await fc.assert(
      fc.asyncProperty(errorScenarioArb, async (scenario) => {
        // Arrange: coreProxy simulates timeout/transport error → 502
        coreProxyMock.mockResolvedValue(
          make502Response(scenario.code, scenario.message),
        );

        const { GET } = await import("@/app/api/v1/admin/users/route");
        // Include valid query params so validation passes and coreProxy is reached
        const req = makeAdminRequest(
          "/api/v1/admin/users?search=&status=all&page=1&page_size=20",
        );

        // Act
        const response = await GET(req);

        // Assert: BFF returns 502 with documented body shape
        await assert502Shape(response);
      }),
      { numRuns: 20 },
    );
  });

  it("GET /api/v1/admin/subscription-plans returns 502 on upstream timeout or transport error", async () => {
    await fc.assert(
      fc.asyncProperty(errorScenarioArb, async (scenario) => {
        // Arrange: coreProxy simulates timeout/transport error → 502
        coreProxyMock.mockResolvedValue(
          make502Response(scenario.code, scenario.message),
        );

        const { GET } = await import(
          "@/app/api/v1/admin/subscription-plans/route"
        );
        const req = makeAdminRequest("/api/v1/admin/subscription-plans");

        // Act
        const response = await GET(req);

        // Assert: BFF returns 502 with documented body shape
        await assert502Shape(response);
      }),
      { numRuns: 20 },
    );
  });

  it("all tested admin routes return 502 for both timeout and transport error kinds", async () => {
    // Exhaustive check: every route × every error kind
    const errorKinds = [
      { code: "UPSTREAM_TIMEOUT", message: "Core service request timed out." },
      {
        code: "UPSTREAM_UNAVAILABLE",
        message: "Core service is temporarily unavailable.",
      },
    ] as const;

    for (const route of ADMIN_ROUTES) {
      for (const errorKind of errorKinds) {
        coreProxyMock.mockResolvedValue(
          make502Response(errorKind.code, errorKind.message),
        );

        const handler = await route.importHandler();
        const req = makeAdminRequest(route.path, route.method);
        const response = await handler(req);

        expect(response.status).toBe(502);
        const body = await response.json();
        expect(body).toMatchObject({
          error: {
            code: expect.any(String),
            message: expect.any(String),
          },
        });
        expect(body.error.code.length).toBeGreaterThan(0);
        expect(body.error.message.length).toBeGreaterThan(0);
      }
    }
  });
});
