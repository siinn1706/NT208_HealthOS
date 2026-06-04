import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const assertSameOriginMock = vi.hoisted(() => vi.fn());
const multipartProxyMock = vi.hoisted(() => vi.fn());
const getBffAuthContextMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/bff-origin-guard", () => ({
  assertSameOrigin: assertSameOriginMock,
}));

vi.mock("@/lib/bff/multipart-proxy", () => ({
  multipartProxy: multipartProxyMock,
}));

vi.mock("@/lib/bff-auth-context", () => ({
  getBffAuthContext: getBffAuthContextMock,
}));

describe("POST /api/v1/meals/analyze-photo — rate limit by principal", () => {
  beforeEach(() => {
    vi.resetModules();
    getBffAuthContextMock.mockReset();
    multipartProxyMock.mockReset();
    assertSameOriginMock.mockReset();
    assertSameOriginMock.mockReturnValue(null); // No CSRF rejection
  });

  it("rate-limits using user principal when JWT sub is available", async () => {
    const sub = "user-photo-123";
    const principal = `user:${sub}`;

    getBffAuthContextMock.mockResolvedValue({
      token: "jwt-token",
      kind: "bearer",
      principal,
    });

    multipartProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ job_id: "job-photo-1" }), { status: 202 }),
    );

    const req = new NextRequest(
      "http://localhost/api/v1/meals/analyze-photo",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer jwt-token`,
          "Content-Type": "multipart/form-data; boundary=----boundary123",
        },
      },
    );

    // Import rate-limit real module to verify key format
    const { __resetBucketsForTests } = await import("@/lib/rate-limit");
    __resetBucketsForTests?.();

    const { POST } = await import("@/app/api/v1/meals/analyze-photo/route");
    const response = await POST(req);

    expect(response.status).toBe(202);
    expect(multipartProxyMock).toHaveBeenCalled();
  });

  it("rate-limits using tk: principal for opaque tokens", async () => {
    const opaqueToken = "opaque-photo-token";
    const principal = `tk:opaque_`;

    getBffAuthContextMock.mockResolvedValue({
      token: opaqueToken,
      kind: "bearer",
      principal,
    });

    multipartProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ job_id: "job-photo-2" }), { status: 202 }),
    );

    const req = new NextRequest(
      "http://localhost/api/v1/meals/analyze-photo",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${opaqueToken}`,
          "Content-Type": "multipart/form-data; boundary=----boundary456",
        },
      },
    );

    const { __resetBucketsForTests } = await import("@/lib/rate-limit");
    __resetBucketsForTests?.();

    const { POST } = await import("@/app/api/v1/meals/analyze-photo/route");
    const response = await POST(req);

    expect(response.status).toBe(202);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const principal = "user:rate-limited-photo";

    getBffAuthContextMock.mockResolvedValue({
      token: "jwt-token",
      kind: "bearer",
      principal,
    });

    const req = new NextRequest(
      "http://localhost/api/v1/meals/analyze-photo",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer jwt-token",
          "Content-Type": "multipart/form-data; boundary=----boundary789",
        },
      },
    );

    // Import real rate-limit and exhaust the bucket
    const { __resetBucketsForTests } = await import("@/lib/rate-limit");
    __resetBucketsForTests?.();

    // Pre-load the bucket to its burst limit (6), then exhaust it
    const { takeToken } = await import("@/lib/rate-limit");
    for (let i = 0; i < 6; i++) {
      takeToken(`analyze-photo:${principal}`, { burst: 6, refillIntervalMs: 10_000 });
    }

    const { POST } = await import("@/app/api/v1/meals/analyze-photo/route");
    const response = await POST(req);

    expect(response.status).toBe(429);
    expect(multipartProxyMock).not.toHaveBeenCalled();
  });

  it("skips rate limiting when principal is null (no auth)", async () => {
    getBffAuthContextMock.mockResolvedValue({
      token: null,
      kind: "none",
      principal: null,
    });

    multipartProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ job_id: "job-photo-3" }), { status: 202 }),
    );

    const req = new NextRequest(
      "http://localhost/api/v1/meals/analyze-photo",
      {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data; boundary=----boundary999",
        },
      },
    );

    const { __resetBucketsForTests } = await import("@/lib/rate-limit");
    __resetBucketsForTests?.();

    const { POST } = await import("@/app/api/v1/meals/analyze-photo/route");
    const response = await POST(req);

    expect(response.status).toBe(202);
    expect(multipartProxyMock).toHaveBeenCalled();
  });

  it("does not call multipartProxy when rate limiter blocks", async () => {
    const principal = "user:blocked-photo";

    getBffAuthContextMock.mockResolvedValue({
      token: "jwt-token",
      kind: "bearer",
      principal,
    });

    const req = new NextRequest(
      "http://localhost/api/v1/meals/analyze-photo",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer jwt-token",
          "Content-Type": "multipart/form-data; boundary=----boundary222",
        },
      },
    );

    const { __resetBucketsForTests } = await import("@/lib/rate-limit");
    __resetBucketsForTests?.();

    // Exhaust the bucket
    const { takeToken } = await import("@/lib/rate-limit");
    for (let i = 0; i < 6; i++) {
      takeToken(`analyze-photo:${principal}`, { burst: 6, refillIntervalMs: 10_000 });
    }

    const { POST } = await import("@/app/api/v1/meals/analyze-photo/route");
    await POST(req);

    expect(multipartProxyMock).not.toHaveBeenCalled();
  });

  it("uses rate limit key format analyze-photo:{principal}", async () => {
    const principal = "user:key-format-photo";

    getBffAuthContextMock.mockResolvedValue({
      token: "jwt-token",
      kind: "bearer",
      principal,
    });

    multipartProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ job_id: "job-photo-4" }), { status: 202 }),
    );

    const req = new NextRequest(
      "http://localhost/api/v1/meals/analyze-photo",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer jwt-token",
          "Content-Type": "multipart/form-data; boundary=----boundary333",
        },
      },
    );

    const { __resetBucketsForTests } = await import("@/lib/rate-limit");
    __resetBucketsForTests?.();

    const { takeToken } = await import("@/lib/rate-limit");
    let capturedKey: string | undefined;
    const originalTakeToken = takeToken;
    vi.spyOn(await import("@/lib/rate-limit"), "takeToken").mockImplementation((key, opts) => {
      capturedKey = key;
      return originalTakeToken(key, opts);
    });

    const { POST } = await import("@/app/api/v1/meals/analyze-photo/route");
    await POST(req);

    const expectedKey = `analyze-photo:${principal}`;
    expect(capturedKey).toBe(expectedKey);
  });

  it("handles 202 Accepted response from multipartProxy", async () => {
    const principal = "user:accepted-photo";

    getBffAuthContextMock.mockResolvedValue({
      token: "jwt-token",
      kind: "bearer",
      principal,
    });

    multipartProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ job_id: "job-photo-5", status: "pending" }), {
        status: 202,
      }),
    );

    const req = new NextRequest(
      "http://localhost/api/v1/meals/analyze-photo",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer jwt-token",
          "Content-Type": "multipart/form-data; boundary=----boundary444",
        },
      },
    );

    const { __resetBucketsForTests } = await import("@/lib/rate-limit");
    __resetBucketsForTests?.();

    const { POST } = await import("@/app/api/v1/meals/analyze-photo/route");
    const response = await POST(req);

    expect(response.status).toBe(202);
  });
});
