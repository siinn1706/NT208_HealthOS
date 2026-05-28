/**
 * Unit tests for useOutboundQueue — IndexedDB-backed outbox for offline chat.
 *
 * fake-indexeddb provides an in-memory IDB implementation in the jsdom env.
 * Tests are isolated via unique conversation IDs (convId()) — each test owns
 * its own conv, so IDB records never collide between tests.
 *
 * The hook resolves the authenticated user into the IndexedDB database name.
 * Tests reset that cached scope between user changes to verify physical DB
 * isolation without relying on a full page reload.
 */
import "fake-indexeddb/auto";
import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/user-scoped-storage", () => ({
  resolveAuthUserId: vi.fn().mockResolvedValue("test-user-1"),
}));

import { resolveAuthUserId } from "@/lib/user-scoped-storage";
import {
  resetOutboundQueueUserScope,
  useOutboundQueue,
  type OutboundItem,
} from "../useOutboundQueue";

const mockResolveAuthUserId = vi.mocked(resolveAuthUserId);

// Generate unique conversation IDs so tests never share IDB records.
let _convCounter = 0;
function convId(): string {
  return `conv-test-${++_convCounter}-${Date.now()}`;
}

function item(
  overrides: Partial<OutboundItem> & { conversation_id?: string }
): Omit<OutboundItem, "enqueued_at" | "attempts"> {
  const cid = overrides.conversation_id ?? convId();
  return {
    client_message_id: `msg-${Date.now()}-${Math.random()}`,
    conversation_id: cid,
    content: "test content",
    reply_to_id: null,
    ...overrides,
  };
}

describe("useOutboundQueue", () => {
  beforeEach(() => {
    mockResolveAuthUserId.mockResolvedValue("test-user-1");
    resetOutboundQueueUserScope();
  });

  it("enqueue then flush sends in FIFO order", async () => {
    const cid = convId();
    const { result } = renderHook(() => useOutboundQueue(cid));

    const order: string[] = [];

    await act(async () => {
      await result.current.enqueue(item({ conversation_id: cid, content: "first", client_message_id: "a" }));
      await result.current.enqueue(item({ conversation_id: cid, content: "second", client_message_id: "b" }));
      await result.current.enqueue(item({ conversation_id: cid, content: "third", client_message_id: "c" }));
    });

    expect(result.current.queued).toHaveLength(3);

    await act(async () => {
      await result.current.flush(async (i) => {
        order.push(i.content);
        return true;
      });
    });

    expect(order).toEqual(["first", "second", "third"]);
    expect(result.current.queued).toHaveLength(0);
  });

  it("flush removes item on success", async () => {
    const cid = convId();
    const { result } = renderHook(() => useOutboundQueue(cid));

    await act(async () => {
      await result.current.enqueue(item({ conversation_id: cid, client_message_id: "del-1" }));
    });

    expect(result.current.queued).toHaveLength(1);

    await act(async () => {
      await result.current.flush(async () => true);
    });

    expect(result.current.queued).toHaveLength(0);
  });

  it("enqueue returns false when IndexedDB is unavailable", async () => {
    const originalIndexedDb = globalThis.indexedDB;
    Object.defineProperty(globalThis, "indexedDB", {
      value: undefined,
      configurable: true,
    });

    try {
      const cid = convId();
      const { result } = renderHook(() => useOutboundQueue(cid));

      let queued = true;
      await act(async () => {
        queued = await result.current.enqueue(
          item({ conversation_id: cid, client_message_id: "no-idb" })
        );
      });

      expect(queued).toBe(false);
      expect(result.current.queued).toHaveLength(0);
    } finally {
      Object.defineProperty(globalThis, "indexedDB", {
        value: originalIndexedDb,
        configurable: true,
      });
    }
  });

  it("flush re-enqueues with attempts++ on failure", async () => {
    const cid = convId();
    const { result } = renderHook(() => useOutboundQueue(cid));

    await act(async () => {
      await result.current.enqueue(item({ conversation_id: cid, client_message_id: "fail-1" }));
    });

    await act(async () => {
      await result.current.flush(async () => false);
    });

    expect(result.current.queued).toHaveLength(1);
    expect(result.current.queued[0].attempts).toBe(1);

    // Second failed flush bumps again
    await act(async () => {
      await result.current.flush(async () => false);
    });

    expect(result.current.queued[0].attempts).toBe(2);
  });

  it("re-entrant flush is no-op while in flight", async () => {
    const cid = convId();
    const { result } = renderHook(() => useOutboundQueue(cid));

    await act(async () => {
      await result.current.enqueue(item({ conversation_id: cid, client_message_id: "reentrant-1" }));
    });

    let resolveFirst!: () => void;
    const firstDone = new Promise<void>((res) => { resolveFirst = res; });

    const sendCallCount = { n: 0 };

    // Start a long flush that we control
    const firstFlush = act(async () => {
      await result.current.flush(async () => {
        sendCallCount.n++;
        await firstDone;
        return true;
      });
    });

    // Immediately try a second flush — must be no-op
    const { sent, failed } = await act(async () =>
      result.current.flush(async () => { sendCallCount.n++; return true; })
    );

    expect(sent).toBe(0);
    expect(failed).toBe(0);

    // Let first flush complete
    resolveFirst();
    await firstFlush;

    // Only the first flush's send was called (once)
    expect(sendCallCount.n).toBe(1);
  });

  it("conversation isolation: different convId → different hook state (no cross-read)", async () => {
    // Validates that dbReadAll filters by conversationId — items enqueued to
    // cidA never appear in a hook mounted on cidB (same DB, different query key).
    const cidA = convId();
    const cidB = convId();

    const hookA = renderHook(() => useOutboundQueue(cidA));
    const hookB = renderHook(() => useOutboundQueue(cidB));

    await act(async () => {
      await hookA.result.current.enqueue(item({ conversation_id: cidA, client_message_id: "only-in-a" }));
    });

    // Force hookB to re-read IDB
    await act(async () => {});

    // hookA sees its item; hookB sees nothing for cidB
    expect(hookA.result.current.queued).toHaveLength(1);
    expect(hookB.result.current.queued).toHaveLength(0);
  });

  it("per-user DB isolation: same convId does not cross-read between auth users", async () => {
    const cid = convId();

    mockResolveAuthUserId.mockResolvedValue("user-a");
    resetOutboundQueueUserScope();
    const hookA = renderHook(() => useOutboundQueue(cid));

    await act(async () => {
      await hookA.result.current.enqueue(
        item({ conversation_id: cid, client_message_id: "user-a-only" })
      );
    });

    expect(hookA.result.current.queued).toHaveLength(1);
    hookA.unmount();

    mockResolveAuthUserId.mockResolvedValue("user-b");
    resetOutboundQueueUserScope();
    const hookB = renderHook(() => useOutboundQueue(cid));

    expect(hookB.result.current.queued).toHaveLength(0);
    hookB.unmount();

    mockResolveAuthUserId.mockResolvedValue("user-a");
    resetOutboundQueueUserScope();
    const hookAAgain = renderHook(() => useOutboundQueue(cid));

    await waitFor(() => {
      expect(hookAAgain.result.current.queued).toHaveLength(1);
    });
    expect(hookAAgain.result.current.queued[0].client_message_id).toBe("user-a-only");
  });

  it("cap at 200 evicts oldest and calls onEvicted", async () => {
    const cid = convId();
    const onEvicted = vi.fn();
    const { result } = renderHook(() => useOutboundQueue(cid, { onEvicted }));

    // Enqueue 201 items — the 201st should trigger eviction
    await act(async () => {
      for (let i = 0; i < 201; i++) {
        await result.current.enqueue(
          item({ conversation_id: cid, client_message_id: `cap-${i}` })
        );
      }
    });

    expect(onEvicted).toHaveBeenCalled();
    const totalEvicted = (onEvicted.mock.calls as [number][]).reduce((s, [n]) => s + n, 0);
    expect(totalEvicted).toBeGreaterThanOrEqual(1);
    expect(result.current.queued.length).toBeLessThanOrEqual(200);
  });
});
