import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const coreProxyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/core-api-proxy", () => ({
  coreProxy: coreProxyMock,
}));

describe("multipartProxy", () => {
  beforeEach(() => {
    vi.resetModules();
    coreProxyMock.mockReset();
  });

  it("calls coreProxy with multipart: true", async () => {
    const req = new NextRequest("http://localhost/api/v1/meals/analyze-photo", {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data; boundary=----boundary" },
    });

    coreProxyMock.mockResolvedValue(
      new NextResponse(JSON.stringify({ job_id: "job-123" }), { status: 202 }),
    );

    const { multipartProxy } = await import("@/lib/bff/multipart-proxy");
    const response = await multipartProxy(req, "/v1/meals/analyze-photo");

    expect(coreProxyMock).toHaveBeenCalledWith(
      req,
      "/v1/meals/analyze-photo",
      expect.objectContaining({
        multipart: true,
      }),
    );
    expect(response.status).toBe(202);
  });

  it("preserves bodySizeLimit option", async () => {
    const req = new NextRequest("http://localhost/api/v1/users/me/avatar", {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data" },
    });

    coreProxyMock.mockResolvedValue(
      new NextResponse(JSON.stringify({ avatar_url: "http://..." }), { status: 200 }),
    );

    const { multipartProxy } = await import("@/lib/bff/multipart-proxy");
    const customLimit = 5 * 1024 * 1024;
    const response = await multipartProxy(req, "/v1/users/me/avatar", {
      bodySizeLimit: customLimit,
    });

    expect(coreProxyMock).toHaveBeenCalledWith(
      req,
      "/v1/users/me/avatar",
      expect.objectContaining({
        multipart: true,
        bodySizeLimit: customLimit,
      }),
    );
    expect(response.status).toBe(200);
  });

  it("forwards extraHeaders to coreProxy", async () => {
    const req = new NextRequest("http://localhost/api/v1/meals/analyze-photo", {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data" },
    });

    coreProxyMock.mockResolvedValue(
      new NextResponse(JSON.stringify({ job_id: "job-456" }), { status: 202 }),
    );

    const { multipartProxy } = await import("@/lib/bff/multipart-proxy");
    const extraHeaders = { "X-Custom-Header": "custom-value" };
    const response = await multipartProxy(req, "/v1/meals/analyze-photo", {
      extraHeaders,
    });

    expect(coreProxyMock).toHaveBeenCalledWith(
      req,
      "/v1/meals/analyze-photo",
      expect.objectContaining({
        multipart: true,
        extraHeaders,
      }),
    );
    expect(response.status).toBe(202);
  });

  it("defaults to POST method when not specified", async () => {
    const req = new NextRequest("http://localhost/api/v1/meals/analyze-photo", {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data" },
    });

    coreProxyMock.mockResolvedValue(
      new NextResponse(JSON.stringify({}), { status: 200 }),
    );

    const { multipartProxy } = await import("@/lib/bff/multipart-proxy");
    await multipartProxy(req, "/v1/meals/analyze-photo");

    expect(coreProxyMock).toHaveBeenCalledWith(
      req,
      "/v1/meals/analyze-photo",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("respects explicit method override", async () => {
    const req = new NextRequest("http://localhost/api/v1/meals/photo", {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data" },
    });

    coreProxyMock.mockResolvedValue(
      new NextResponse(JSON.stringify({}), { status: 200 }),
    );

    const { multipartProxy } = await import("@/lib/bff/multipart-proxy");
    await multipartProxy(req, "/v1/meals/photo", { method: "PUT" });

    expect(coreProxyMock).toHaveBeenCalledWith(
      req,
      "/v1/meals/photo",
      expect.objectContaining({
        method: "PUT",
      }),
    );
  });

  it("defaults requireAuth to true", async () => {
    const req = new NextRequest("http://localhost/api/v1/meals/analyze-photo", {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data" },
    });

    coreProxyMock.mockResolvedValue(
      new NextResponse(JSON.stringify({}), { status: 200 }),
    );

    const { multipartProxy } = await import("@/lib/bff/multipart-proxy");
    await multipartProxy(req, "/v1/meals/analyze-photo");

    expect(coreProxyMock).toHaveBeenCalledWith(
      req,
      "/v1/meals/analyze-photo",
      expect.objectContaining({
        requireAuth: true,
      }),
    );
  });

  it("respects explicit requireAuth: false", async () => {
    const req = new NextRequest("http://localhost/api/v1/public/upload", {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data" },
    });

    coreProxyMock.mockResolvedValue(
      new NextResponse(JSON.stringify({}), { status: 200 }),
    );

    const { multipartProxy } = await import("@/lib/bff/multipart-proxy");
    await multipartProxy(req, "/v1/public/upload", { requireAuth: false });

    expect(coreProxyMock).toHaveBeenCalledWith(
      req,
      "/v1/public/upload",
      expect.objectContaining({
        requireAuth: false,
      }),
    );
  });

  it("combines all options correctly", async () => {
    const req = new NextRequest("http://localhost/api/v1/meals/analyze-photo", {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data" },
    });

    coreProxyMock.mockResolvedValue(
      new NextResponse(JSON.stringify({ job_id: "job-789" }), { status: 202 }),
    );

    const { multipartProxy } = await import("@/lib/bff/multipart-proxy");
    const limit = 8 * 1024 * 1024;
    const headers = { "X-Request-ID": "req-456" };
    const response = await multipartProxy(req, "/v1/meals/analyze-photo", {
      method: "PUT",
      bodySizeLimit: limit,
      extraHeaders: headers,
      requireAuth: true,
    });

    expect(coreProxyMock).toHaveBeenCalledWith(
      req,
      "/v1/meals/analyze-photo",
      expect.objectContaining({
        multipart: true,
        method: "PUT",
        bodySizeLimit: limit,
        extraHeaders: headers,
        requireAuth: true,
      }),
    );
    expect(response.status).toBe(202);
  });
});
