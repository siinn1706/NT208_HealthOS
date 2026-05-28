/**
 * admin-bff-passthrough.test.ts
 *
 * Property 4: BFF passthrough preserves status and body
 *
 * For all admin BFF routes and any upstream Core response (status, body),
 * when the inbound request is authenticated as admin, the BFF response
 * status equals `status` and the BFF response body equals `body` unchanged.
 *
 * **Validates: Requirements 3.1, 3.3, 3.5, 3.6, 3.7**
 */

import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fc from "fast-check";

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock requireAdminSession to return null (admin confirmed) for all tests.
vi.mock("@/lib/admin/bff-admin-guard", () => ({
  requireAdminSession: vi.fn().mockResolvedValue(null),
}));

// Mock coreProxy to return a NextResponse with the given status and body.
// The mock is configured per-test via mockCoreProxy().
const mockCoreProxyFn = vi.fn<[NextRequest, string], Promise<NextResponse>>();

vi.mock("@/lib/core-api-proxy", () => ({
  coreProxy: (...args: [NextRequest, string]) => mockCoreProxyFn(...args),
}));

// ── Static imports of route handlers (after mocks are set up) ─────────────────

import * as bffGuard from "@/lib/admin/bff-admin-guard";
import { GET as overviewGET } from "@/app/api/v1/admin/overview/route";
import { GET as usersIdGET } from "@/app/api/v1/admin/users/[id]/route";
import { POST as unbanPOST } from "@/app/api/v1/admin/users/[id]/unban/route";
import { GET as plansGET } from "@/app/api/v1/admin/subscription-plans/route";
import {
  GET as planIdGET,
  PATCH as planIdPATCH,
} from "@/app/api/v1/admin/subscription-plans/[id]/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Configure the coreProxy mock to return a NextResponse with the given
 * status code and JSON body.
 */
function mockCoreProxy(status: number, body: unknown): void {
  mockCoreProxyFn.mockResolvedValue(NextResponse.json(body, { status }));
}

/**
 * Build a minimal NextRequest for the given URL path and HTTP method.
 */
function makeRequest(
  path: string,
  method: "GET" | "POST" | "PATCH" = "GET",
  body?: unknown,
): NextRequest {
  const url = `https://example.com${path}`;
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(url, init);
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

/** Arbitrary HTTP status codes in the range [200, 599].
 *
 * Uses a curated set of status codes that support JSON response bodies
 * in the jsdom/undici environment (excludes 204, 205, 304 which are
 * body-less per the Fetch spec).
 */
const statusArb = fc.constantFrom(
  // 2xx success
  200, 201, 202, 206,
  // 3xx redirects (with body)
  300, 301, 302, 303, 307, 308,
  // 4xx client errors
  400, 401, 403, 404, 405, 409, 410, 413, 415, 422, 429,
  // 5xx server errors
  500, 502, 503, 504,
);

/** Arbitrary JSON body with a single string `data` field. */
const bodyArb = fc.record({ data: fc.string() });

/** Arbitrary valid planPatchSchema body (all fields optional). */
const planPatchBodyArb = fc.record(
  {
    is_active: fc.boolean(),
    is_recommended: fc.boolean(),
    price_vnd: fc.integer({ min: 0, max: 1_000_000_000_000 }),
    description: fc.string({ maxLength: 100 }),
  },
  { withDeletedKeys: true },
);

// ── Property 4: BFF passthrough preserves status and body ─────────────────────

/**
 * **Property 4: BFF passthrough preserves status and body**
 *
 * For all admin BFF routes `r` and any upstream Core response `(status, body)`,
 * when the inbound request is authenticated as admin, the BFF response status
 * equals `status` and the BFF response body equals `body` unchanged.
 *
 * **Validates: Requirements 3.1, 3.3, 3.5, 3.6, 3.7**
 */
describe("Property 4: BFF passthrough preserves status and body", () => {
  beforeEach(() => {
    // Ensure requireAdminSession always returns null (admin confirmed).
    vi.mocked(bffGuard.requireAdminSession).mockResolvedValue(null);
    // Reset coreProxy call history between tests.
    mockCoreProxyFn.mockReset();
  });

  // ── GET /api/v1/admin/overview ─────────────────────────────────────────────

  it("GET /api/v1/admin/overview: response status and body match Core's response", async () => {
    // **Validates: Requirements 3.1**
    await fc.assert(
      fc.asyncProperty(statusArb, bodyArb, async (status, body) => {
        mockCoreProxy(status, body);

        const req = makeRequest("/api/v1/admin/overview");
        const response = await overviewGET(req);

        expect(response.status).toBe(status);
        const responseBody = await response.json();
        expect(responseBody).toEqual(body);
      }),
      { numRuns: 50 },
    );
  });

  // ── GET /api/v1/admin/users/[id] ──────────────────────────────────────────

  it("GET /api/v1/admin/users/[id]: response status and body match Core's response", async () => {
    // **Validates: Requirements 3.3**
    await fc.assert(
      fc.asyncProperty(
        statusArb,
        bodyArb,
        // Generate valid user IDs (length 1–64)
        fc.string({ minLength: 1, maxLength: 64 }),
        async (status, body, userId) => {
          mockCoreProxy(status, body);

          const req = makeRequest(`/api/v1/admin/users/${userId}`);
          const params = Promise.resolve({ id: userId });
          const response = await usersIdGET(req, { params });

          expect(response.status).toBe(status);
          const responseBody = await response.json();
          expect(responseBody).toEqual(body);
        },
      ),
      { numRuns: 50 },
    );
  });

  // ── POST /api/v1/admin/users/[id]/unban ───────────────────────────────────

  it("POST /api/v1/admin/users/[id]/unban: response status and body match Core's response", async () => {
    // **Validates: Requirements 3.5**
    await fc.assert(
      fc.asyncProperty(
        statusArb,
        bodyArb,
        fc.string({ minLength: 1, maxLength: 64 }),
        async (status, body, userId) => {
          mockCoreProxy(status, body);

          const req = makeRequest(
            `/api/v1/admin/users/${userId}/unban`,
            "POST",
          );
          const params = Promise.resolve({ id: userId });
          const response = await unbanPOST(req, { params });

          expect(response.status).toBe(status);
          const responseBody = await response.json();
          expect(responseBody).toEqual(body);
        },
      ),
      { numRuns: 50 },
    );
  });

  // ── GET /api/v1/admin/subscription-plans ──────────────────────────────────

  it("GET /api/v1/admin/subscription-plans: response status and body match Core's response", async () => {
    // **Validates: Requirements 3.6**
    await fc.assert(
      fc.asyncProperty(statusArb, bodyArb, async (status, body) => {
        mockCoreProxy(status, body);

        const req = makeRequest("/api/v1/admin/subscription-plans");
        const response = await plansGET(req);

        expect(response.status).toBe(status);
        const responseBody = await response.json();
        expect(responseBody).toEqual(body);
      }),
      { numRuns: 50 },
    );
  });

  // ── GET /api/v1/admin/subscription-plans/[id] ─────────────────────────────

  it("GET /api/v1/admin/subscription-plans/[id]: response status and body match Core's response", async () => {
    // **Validates: Requirements 3.7**
    await fc.assert(
      fc.asyncProperty(
        statusArb,
        bodyArb,
        fc.string({ minLength: 1, maxLength: 64 }),
        async (status, body, planId) => {
          mockCoreProxy(status, body);

          const req = makeRequest(
            `/api/v1/admin/subscription-plans/${planId}`,
          );
          const params = Promise.resolve({ id: planId });
          const response = await planIdGET(req, { params });

          expect(response.status).toBe(status);
          const responseBody = await response.json();
          expect(responseBody).toEqual(body);
        },
      ),
      { numRuns: 50 },
    );
  });

  // ── PATCH /api/v1/admin/subscription-plans/[id] ───────────────────────────

  it("PATCH /api/v1/admin/subscription-plans/[id]: response status and body match Core's response (valid body)", async () => {
    // **Validates: Requirements 3.7**
    await fc.assert(
      fc.asyncProperty(
        statusArb,
        bodyArb,
        fc.string({ minLength: 1, maxLength: 64 }),
        planPatchBodyArb,
        async (status, body, planId, patchBody) => {
          mockCoreProxy(status, body);

          const req = makeRequest(
            `/api/v1/admin/subscription-plans/${planId}`,
            "PATCH",
            patchBody,
          );
          const params = Promise.resolve({ id: planId });
          const response = await planIdPATCH(req, { params });

          expect(response.status).toBe(status);
          const responseBody = await response.json();
          expect(responseBody).toEqual(body);
        },
      ),
      { numRuns: 50 },
    );
  });
});
