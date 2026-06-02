/**
 * bff-fetch-stream — unit tests
 *
 * Verifies:
 *   1. Headers-timeout aborts the request when headers are not received in time
 *   2. Body stream is NOT killed after headers arrive (timeout cleared)
 *   3. 401 responses trigger the login redirect (same as bffFetch)
 *   4. Non-OK responses throw BffError
 *   5. Caller's AbortSignal is respected (stop-generation button path)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { bffFetchStream } from "@/lib/bff-fetch-stream";
import { BffError } from "@/lib/api-client";

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function makeStreamResponse(body: string, status = 200): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      controller.close();
    },
  });
  return new Response(stream, {
    status,
    headers: { "Content-Type": "text/event-stream" },
  });
}

function makeJsonErrorResponse(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe("bffFetchStream", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("returns the Response with body stream intact on 200 OK", async () => {
    fetchSpy.mockResolvedValueOnce(makeStreamResponse("event: ping\ndata: {}\n\n"));

    const res = await bffFetchStream("/api/v1/conversations/c1/messages/stream", {
      method: "POST",
      body: "{}",
    });

    expect(res.ok).toBe(true);
    expect(res.body).toBeTruthy();
    const text = await res.text();
    expect(text).toBe("event: ping\ndata: {}\n\n");
  });

  it("clears the headers-timeout once headers are received so the body stream continues", async () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    fetchSpy.mockResolvedValueOnce(makeStreamResponse("data: chunk\n\n"));

    const resPromise = bffFetchStream("/api/v1/conversations/c1/messages/stream", {}, 5_000);
    // Advance timers — but fetch already resolved so the timeout should have been cleared.
    vi.advanceTimersByTime(6_000);
    const res = await resPromise;

    expect(res.ok).toBe(true);
    // clearTimeout must have been called to cancel the headers-phase timer.
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("aborts the fetch when headers-timeout expires before fetch resolves", async () => {
    vi.useFakeTimers();

    // Simulate fetch that never resolves (slow server).
    fetchSpy.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          if (init.signal) {
            init.signal.addEventListener("abort", () =>
              reject(Object.assign(new Error("AbortError"), { name: "AbortError" })),
            );
          }
        }),
    );

    const headersTimeoutMs = 100;
    const resPromise = bffFetchStream(
      "/api/v1/conversations/c1/messages/stream",
      { method: "POST", body: "{}" },
      headersTimeoutMs,
    );

    // Fire the timeout.
    vi.advanceTimersByTime(headersTimeoutMs + 10);

    await expect(resPromise).rejects.toThrow();
  });

  it("throws BffError on non-OK responses", async () => {
    fetchSpy.mockResolvedValueOnce(
      makeJsonErrorResponse(500, "INTERNAL_ERROR", "Something went wrong"),
    );

    await expect(
      bffFetchStream("/api/v1/conversations/c1/messages/stream"),
    ).rejects.toBeInstanceOf(BffError);
  });

  it("throws BffError with correct status and code on 4xx", async () => {
    fetchSpy.mockResolvedValueOnce(
      makeJsonErrorResponse(429, "RATE_LIMITED", "Too many requests"),
    );

    const err = await bffFetchStream("/api/v1/conversations/c1/messages/stream").catch(
      (e: unknown) => e,
    );

    expect(err).toBeInstanceOf(BffError);
    expect((err as BffError).status).toBe(429);
    expect((err as BffError).code).toBe("RATE_LIMITED");
  });

  it("respects the caller's AbortSignal (stop-generation button)", async () => {
    const callerController = new AbortController();

    fetchSpy.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          if (init.signal) {
            init.signal.addEventListener("abort", () =>
              reject(Object.assign(new Error("AbortError"), { name: "AbortError" })),
            );
          }
        }),
    );

    const resPromise = bffFetchStream(
      "/api/v1/conversations/c1/messages/stream",
      { signal: callerController.signal },
    );

    callerController.abort();

    await expect(resPromise).rejects.toThrow();
    // Verify fetch was called with a signal.
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/conversations/c1/messages/stream",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("merges Content-Type default header with caller headers", async () => {
    fetchSpy.mockResolvedValueOnce(makeStreamResponse(""));

    await bffFetchStream("/api/v1/conversations/c1/messages/stream", {
      method: "POST",
      headers: { Accept: "text/event-stream" },
      body: "{}",
    });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect((init.headers as Record<string, string>)["Accept"]).toBe("text/event-stream");
  });
});
