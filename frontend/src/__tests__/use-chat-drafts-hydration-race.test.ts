/**
 * useChatDrafts — hydration-race regression tests
 *
 * Verifies that rapidly switching conversations while the userId resolution
 * promise is in flight never clobbers the draft for the *current* conversation
 * with the draft that belongs to the *previous* one.
 *
 * Scenario under test:
 *   1. Hook mounts with conversationId = "conv-A"
 *   2. resolveAuthUserId() is slow (pending promise)
 *   3. Consumer switches to conversationId = "conv-B" before userId resolves
 *   4. resolveAuthUserId() resolves
 *   5. Draft displayed must be "conv-B"'s draft, NOT "conv-A"'s draft
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChatDrafts } from "@/hooks/useChatDrafts";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let resolveUserId!: (uid: string) => void;

vi.mock("@/lib/user-scoped-storage", () => ({
  resolveAuthUserId: () =>
    new Promise<string>((resolve) => {
      resolveUserId = resolve;
    }),
  // userKeySync returns a deterministic key without needing real crypto.
  userKeySync: (userId: string | null, bucket: string, convId: string) =>
    `${userId ?? "anon"}:${bucket}:${convId}`,
}));

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function setStoredDraft(userId: string, convId: string, content: string) {
  const key = `${userId}:chat-draft:${convId}`;
  localStorage.setItem(
    key,
    JSON.stringify({ content, updated_at: Date.now() }),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useChatDrafts — hydration race (generation token)", () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset the resolveUserId capture before each test.
    resolveUserId = undefined as unknown as (uid: string) => void;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does NOT clobber conv-B draft when userId resolves after a conversation switch", async () => {
    setStoredDraft("user-1", "conv-A", "draft for A");
    setStoredDraft("user-1", "conv-B", "draft for B");

    const { result, rerender } = renderHook(
      ({ convId }: { convId: string }) => useChatDrafts(convId),
      { initialProps: { convId: "conv-A" } },
    );

    // Initially no draft (userId not resolved yet).
    expect(result.current.draft).toBe("");

    // Switch conversation before userId resolves.
    rerender({ convId: "conv-B" });

    // Now userId resolves — the stale conv-A hydration callback must be dropped.
    act(() => {
      resolveUserId("user-1");
    });

    await waitFor(() => {
      // Must show conv-B's draft, NOT conv-A's.
      expect(result.current.draft).toBe("draft for B");
    });
  });

  it("loads the correct draft immediately when userId is already resolved on switch", async () => {
    setStoredDraft("user-1", "conv-A", "draft for A");
    setStoredDraft("user-1", "conv-B", "draft for B");

    const { result, rerender } = renderHook(
      ({ convId }: { convId: string }) => useChatDrafts(convId),
      { initialProps: { convId: "conv-A" } },
    );

    // Resolve userId before switching.
    act(() => {
      resolveUserId("user-1");
    });

    await waitFor(() => {
      expect(result.current.draft).toBe("draft for A");
    });

    // Switch — must immediately show conv-B's draft.
    rerender({ convId: "conv-B" });

    await waitFor(() => {
      expect(result.current.draft).toBe("draft for B");
    });
  });

  it("returns empty string when no stored draft exists for the current conversation", async () => {
    const { result } = renderHook(() => useChatDrafts("conv-empty"));

    act(() => {
      resolveUserId("user-1");
    });

    await waitFor(() => {
      // No entry in localStorage for conv-empty → empty string.
      expect(result.current.draft).toBe("");
    });
  });

  it("setDraft updates in-memory state synchronously", async () => {
    const { result } = renderHook(() => useChatDrafts("conv-A"));

    act(() => {
      resolveUserId("user-1");
    });

    await waitFor(() => expect(result.current.draft).toBe(""));

    act(() => {
      result.current.setDraft("hello world");
    });

    expect(result.current.draft).toBe("hello world");
  });

  it("clear() empties the draft and removes localStorage entry", async () => {
    setStoredDraft("user-1", "conv-A", "saved draft");

    const { result } = renderHook(() => useChatDrafts("conv-A"));

    act(() => {
      resolveUserId("user-1");
    });

    await waitFor(() => expect(result.current.draft).toBe("saved draft"));

    act(() => {
      result.current.clear();
    });

    expect(result.current.draft).toBe("");
    // Verify localStorage was cleaned up.
    expect(localStorage.getItem("user-1:chat-draft:conv-A")).toBeNull();
  });
});
