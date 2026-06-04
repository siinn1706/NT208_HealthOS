import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getBffAuthContextMock = vi.hoisted(() => vi.fn());
const coreFetchStreamMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/bff-auth-context", () => ({
  getBffAuthContext: getBffAuthContextMock,
}));

vi.mock("@/lib/core-api-proxy", () => ({
  coreFetchStream: coreFetchStreamMock,
}));

describe("POST /api/v1/conversations/[id]/messages/stream — rate limit by principal", () => {
  beforeEach(() => {
    vi.resetModules();
    getBffAuthContextMock.mockReset();
    coreFetchStreamMock.mockReset();
  });

  it("rate-limits using user principal when JWT sub is available", async () => {
    const sub = "user-stream-123";
    const principal = `user:${sub}`;

    getBffAuthContextMock.mockResolvedValue({
      token: "jwt-token",
      kind: "bearer",
      principal,
    });

    const neverEndingStream = new ReadableStream({ start() {} });
    coreFetchStreamMock.mockResolvedValue(
      new Response(neverEndingStream, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      }),
    );

    const req = new NextRequest(
      "http://localhost/api/v1/conversations/conv-1/messages/stream",
      {
        method: "POST",
        headers: { Authorization: `Bearer jwt-token` },
        body: JSON.stringify({ message: "hello" }),
      },
    );

    const { __resetBucketsForTests } = await import("@/lib/rate-limit");
    __resetBucketsForTests?.();

    const ctx = { params: Promise.resolve({ id: "conv-1" }) };
    const { POST } = await import(
      "@/app/api/v1/conversations/[id]/messages/stream/route"
    );
    const response = await POST(req, ctx);

    expect(response.status).toBe(200);
  });

  it("rate-limits using tk: principal for opaque tokens", async () => {
    const opaqueToken = "opaque-token-abc";
    const principal = `tk:opaque_`;

    getBffAuthContextMock.mockResolvedValue({
      token: opaqueToken,
      kind: "bearer",
      principal,
    });

    const neverEndingStream = new ReadableStream({ start() {} });
    coreFetchStreamMock.mockResolvedValue(
      new Response(neverEndingStream, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      }),
    );

    const req = new NextRequest(
      "http://localhost/api/v1/conversations/conv-2/messages/stream",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${opaqueToken}` },
        body: JSON.stringify({ message: "hello" }),
      },
    );

    const { __resetBucketsForTests } = await import("@/lib/rate-limit");
    __resetBucketsForTests?.();

    const ctx = { params: Promise.resolve({ id: "conv-2" }) };
    const { POST } = await import(
      "@/app/api/v1/conversations/[id]/messages/stream/route"
    );
    const response = await POST(req, ctx);

    expect(response.status).toBe(200);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const principal = "user:rate-limited-user";

    getBffAuthContextMock.mockResolvedValue({
      token: "jwt-token",
      kind: "bearer",
      principal,
    });

    const req = new NextRequest(
      "http://localhost/api/v1/conversations/conv-3/messages/stream",
      {
        method: "POST",
        headers: { Authorization: "Bearer jwt-token" },
      },
    );

    const { __resetBucketsForTests } = await import("@/lib/rate-limit");
    __resetBucketsForTests?.();

    // Exhaust the burst bucket (assume 100 is the burst limit)
    const { takeToken } = await import("@/lib/rate-limit");
    const opts = { burst: 100, refillIntervalMs: 10_000 };
    for (let i = 0; i < 100; i++) {
      takeToken(`chat-stream:${principal}`, opts);
    }

    const ctx = { params: Promise.resolve({ id: "conv-3" }) };
    const { POST } = await import(
      "@/app/api/v1/conversations/[id]/messages/stream/route"
    );
    const response = await POST(req, ctx);

    expect(response.status).toBe(429);
    expect(coreFetchStreamMock).not.toHaveBeenCalled();
  });

  it("does not call coreFetchStream when rate limiter blocks", async () => {
    const principal = "user:blocked-user";

    getBffAuthContextMock.mockResolvedValue({
      token: "jwt-token",
      kind: "bearer",
      principal,
    });

    const req = new NextRequest(
      "http://localhost/api/v1/conversations/conv-4/messages/stream",
      {
        method: "POST",
      },
    );

    const { __resetBucketsForTests } = await import("@/lib/rate-limit");
    __resetBucketsForTests?.();

    // Exhaust the burst bucket
    const { takeToken } = await import("@/lib/rate-limit");
    const opts = { burst: 100, refillIntervalMs: 10_000 };
    for (let i = 0; i < 100; i++) {
      takeToken(`chat-stream:${principal}`, opts);
    }

    const ctx = { params: Promise.resolve({ id: "conv-4" }) };
    const { POST } = await import(
      "@/app/api/v1/conversations/[id]/messages/stream/route"
    );
    await POST(req, ctx);

    expect(coreFetchStreamMock).not.toHaveBeenCalled();
  });

  it("uses rate limit key format chat-stream:{principal}", async () => {
    const principal = "user:key-format-test";

    getBffAuthContextMock.mockResolvedValue({
      token: "jwt-token",
      kind: "bearer",
      principal,
    });

    const neverEndingStream = new ReadableStream({ start() {} });
    coreFetchStreamMock.mockResolvedValue(
      new Response(neverEndingStream, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      }),
    );

    const req = new NextRequest(
      "http://localhost/api/v1/conversations/conv-5/messages/stream",
      {
        method: "POST",
        headers: { Authorization: "Bearer jwt-token" },
      },
    );

    const { __resetBucketsForTests } = await import("@/lib/rate-limit");
    __resetBucketsForTests?.();

    // Spy on takeToken to capture the key
    let capturedKey: string | undefined;
    const { takeToken } = await import("@/lib/rate-limit");
    const originalTakeToken = takeToken;
    vi.spyOn(await import("@/lib/rate-limit"), "takeToken").mockImplementation((key, opts) => {
      capturedKey = key;
      return originalTakeToken(key, opts);
    });

    const ctx = { params: Promise.resolve({ id: "conv-5" }) };
    const { POST } = await import(
      "@/app/api/v1/conversations/[id]/messages/stream/route"
    );
    await POST(req, ctx);

    const expectedKey = `chat-stream:${principal}`;
    expect(capturedKey).toBe(expectedKey);
  });
});
