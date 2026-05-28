/**
 * Tests for useMessages.sendMessage — offline / error code handling.
 *
 * Verifies:
 * 1. Network failure produces error_code="network" and calls onNetworkFailure.
 * 2. HTTP 429 produces error_code="rate_limited" without calling onNetworkFailure.
 * 3. Duplicate WS frame upsert does not create two message bubbles.
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

// Stub modules required by useChat internals
vi.mock("@/lib/api-client", () => ({
  bffFetch: vi.fn(),
}));
vi.mock("@/lib/user-scoped-storage", () => ({
  resolveAuthUserId: vi.fn().mockResolvedValue("user-current"),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

import { bffFetch } from "@/lib/api-client";
import { useMessages } from "../useChat";

const CONV_ID = "conv-offline-test";
const USER_ID = "user-current";

describe("useMessages.sendMessage — error codes", () => {
  beforeEach(() => {
    (bffFetch as Mock).mockReset();
  });

  it("network failure: status=undefined → error_code=network, onNetworkFailure called", async () => {
    (bffFetch as Mock).mockRejectedValue({ status: undefined });

    const { result } = renderHook(() => useMessages(CONV_ID, USER_ID));

    const onNetworkFailure = vi.fn().mockResolvedValue(undefined);

    let returned!: ReturnType<typeof result.current.sendMessage> extends Promise<infer T> ? T : never;
    await act(async () => {
      returned = await result.current.sendMessage(
        CONV_ID,
        "hello",
        undefined,
        undefined,
        onNetworkFailure,
      );
    });

    expect(returned.status).toBe("failed");
    expect(returned.error_code).toBe("network");
    expect(onNetworkFailure).toHaveBeenCalledOnce();
    expect(onNetworkFailure).toHaveBeenCalledWith(returned);
  });

  it("rate-limit failure: status=429 → error_code=rate_limited, onNetworkFailure NOT called", async () => {
    (bffFetch as Mock).mockRejectedValue({ status: 429 });

    const { result } = renderHook(() => useMessages(CONV_ID, USER_ID));

    const onNetworkFailure = vi.fn();

    let returned!: ReturnType<typeof result.current.sendMessage> extends Promise<infer T> ? T : never;
    await act(async () => {
      returned = await result.current.sendMessage(
        CONV_ID,
        "hello",
        undefined,
        undefined,
        onNetworkFailure,
      );
    });

    expect(returned.status).toBe("failed");
    expect(returned.error_code).toBe("rate_limited");
    expect(onNetworkFailure).not.toHaveBeenCalled();
  });

  it("duplicate WS frame upsert does not create two bubbles", async () => {
    const confirmedMessage = {
      id: "server-id-1",
      conversation_id: CONV_ID,
      sender_id: USER_ID,
      content: "hello",
      content_type: "text",
      status: "sent",
      created_at: new Date().toISOString(),
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
    };

    // Initial messages load (GET) returns empty list; sendMessage POST returns confirmed DTO.
    (bffFetch as Mock).mockImplementation((url: string, opts?: { method?: string }) => {
      if (opts?.method === "POST") {
        return Promise.resolve({ data: confirmedMessage });
      }
      // GET — initial message load
      return Promise.resolve({ data: [], has_more: false, next_cursor: null });
    });

    const { result } = renderHook(() => useMessages(CONV_ID, USER_ID));

    await act(async () => {
      await result.current.sendMessage(CONV_ID, "hello");
    });

    // Confirmed message is in state (optimistic replaced)
    await waitFor(() => {
      const beforeUpsert = result.current.messages.filter((m) => m.id === "server-id-1");
      expect(beforeUpsert).toHaveLength(1);
    });

    // Simulate WS rebroadcast of the same message frame
    act(() => {
      result.current.upsertMessage(confirmedMessage);
    });

    // Still exactly one bubble
    const afterUpsert = result.current.messages.filter((m) => m.id === "server-id-1");
    expect(afterUpsert).toHaveLength(1);
  });

  it("does not preserve local messages across conversation switches", async () => {
    const convB = "conv-other-test";
    const confirmedA = {
      id: "server-id-a",
      conversation_id: CONV_ID,
      sender_id: USER_ID,
      content: "message in A",
      content_type: "text",
      status: "sent",
      created_at: "2026-05-27T01:00:00.000Z",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
    };
    const remoteB = {
      id: "server-id-b",
      conversation_id: convB,
      sender_id: "user-other",
      content: "message in B",
      content_type: "text",
      status: "sent",
      created_at: "2026-05-27T01:01:00.000Z",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
    };

    (bffFetch as Mock).mockImplementation((url: string, opts?: { method?: string }) => {
      if (opts?.method === "POST") return Promise.resolve({ data: confirmedA });
      if (url.includes(`/conversations/${convB}/messages`)) {
        return Promise.resolve({ data: [remoteB], has_more: false, next_cursor: null });
      }
      return Promise.resolve({ data: [], has_more: false, next_cursor: null });
    });

    const { result, rerender } = renderHook(
      ({ conversationId }) => useMessages(conversationId, USER_ID),
      { initialProps: { conversationId: CONV_ID } },
    );

    await act(async () => {
      await result.current.sendMessage(CONV_ID, "message in A");
    });

    await waitFor(() => {
      expect(result.current.messages.map((m) => m.id)).toEqual(["server-id-a"]);
    });

    rerender({ conversationId: convB });

    await waitFor(() => {
      expect(result.current.messages.map((m) => m.id)).toEqual(["server-id-b"]);
      expect(result.current.messages.every((m) => m.conversation_id === convB)).toBe(true);
    });
  });

  it("ignores delayed send completion after switching conversations", async () => {
    const convB = "conv-delayed-target";
    const confirmedA = {
      id: "server-id-delayed-a",
      conversation_id: CONV_ID,
      sender_id: USER_ID,
      content: "slow message in A",
      content_type: "text",
      status: "sent",
      created_at: "2026-05-27T02:00:00.000Z",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
    };
    const remoteB = {
      id: "server-id-delayed-b",
      conversation_id: convB,
      sender_id: "user-other",
      content: "message in B",
      content_type: "text",
      status: "sent",
      created_at: "2026-05-27T02:01:00.000Z",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
    };
    let resolvePost!: (value: { data: typeof confirmedA }) => void;
    const postPromise = new Promise<{ data: typeof confirmedA }>((resolve) => {
      resolvePost = resolve;
    });

    (bffFetch as Mock).mockImplementation((url: string, opts?: { method?: string }) => {
      if (opts?.method === "POST") return postPromise;
      if (url.includes(`/conversations/${convB}/messages`)) {
        return Promise.resolve({ data: [remoteB], has_more: false, next_cursor: null });
      }
      return Promise.resolve({ data: [], has_more: false, next_cursor: null });
    });

    const { result, rerender } = renderHook(
      ({ conversationId }) => useMessages(conversationId, USER_ID),
      { initialProps: { conversationId: CONV_ID } },
    );

    let sendPromise!: ReturnType<typeof result.current.sendMessage>;
    act(() => {
      sendPromise = result.current.sendMessage(CONV_ID, "slow message in A");
    });

    rerender({ conversationId: convB });

    await waitFor(() => {
      expect(result.current.messages.map((m) => m.id)).toEqual(["server-id-delayed-b"]);
    });

    await act(async () => {
      resolvePost({ data: confirmedA });
      await sendPromise;
    });

    expect(result.current.messages.map((m) => m.id)).toEqual(["server-id-delayed-b"]);
    expect(result.current.messages.every((m) => m.conversation_id === convB)).toBe(true);
  });
});
