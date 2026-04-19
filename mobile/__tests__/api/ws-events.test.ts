/**
 * Verifies the legacy → canonical event mapping matches what
 * backend/app/ws/chat_router.py:broadcast_dual() actually emits, and that
 * dedupe keys collapse correctly across the dual-broadcast pair.
 */
import { canonicalEventName, dedupeKey } from "@/api/ws/events";

describe("WS event mapping", () => {
  it("collapses each legacy event name to its chat.* canonical", () => {
    expect(canonicalEventName("msg:new")).toBe("chat.message.sent");
    expect(canonicalEventName("msg:edit")).toBe("chat.message.edited");
    expect(canonicalEventName("msg:delete")).toBe("chat.message.recalled");
    expect(canonicalEventName("msg:react")).toBe("chat.message.reacted");
    // Backend uses past-tense pinned/unpinned for legacy
    // (per chat_router.py broadcast_dual calls).
    expect(canonicalEventName("msg:pinned")).toBe("chat.message.pinned");
    expect(canonicalEventName("msg:unpinned")).toBe("chat.message.unpinned");
    expect(canonicalEventName("msg:read")).toBe("chat.message.read");
    expect(canonicalEventName("typing")).toBe("chat.typing");
  });

  it("returns the same name for already-canonical events", () => {
    expect(canonicalEventName("chat.message.sent")).toBe("chat.message.sent");
    expect(canonicalEventName("chat.typing")).toBe("chat.typing");
  });

  it("returns the same name for unknown events", () => {
    expect(canonicalEventName("conv:joined")).toBe("conv:joined");
    expect(canonicalEventName("user.status")).toBe("user.status");
  });
});

describe("dedupeKey", () => {
  it("collapses legacy + canonical pair into the same key", () => {
    const payload = {
      conversation_id: "abc",
      message_id: "msg-1",
    };
    expect(dedupeKey("msg:pinned", payload)).toBe(
      dedupeKey("chat.message.pinned", payload)
    );
  });

  it("uses server_message_id when available", () => {
    const payload = { server_message_id: "srv-7" };
    expect(dedupeKey("msg:new", payload)).toBe("chat.message.sent:srv-7");
  });

  it("falls back to client_message_id for optimistic acks", () => {
    const payload = { client_message_id: "tmp-3" };
    expect(dedupeKey("msg:ack", payload)).toBe("msg:ack:tmp-3");
  });
});
