/**
 * Tests for the AI streaming reducers exposed by ``useMessages``:
 *  - onAiStreamStarted inserts a placeholder bubble
 *  - onAiStreamChunk appends deltas
 *  - onAiStreamCompleted swaps the placeholder for the final MessageDTO
 *
 * We exercise the reducers via React Testing Library's ``renderHook`` so
 * the test stays close to how ``ChatWindow`` actually consumes them.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { useMessages } from "@/hooks/useChat";

// useMessages calls bffFetch on mount; mock it so the test doesn't hit network.
vi.mock("@/lib/api-client", () => ({
  bffFetch: vi.fn(async () => ({ data: [], has_more: false, next_cursor: null })),
}));

const CONV_ID = "conv-1";
const USER_ID = "user-1";
const BOT_ID = "ai-bot-1";
const MSG_ID = "msg-stream-1";

beforeAll(() => {
  if (!globalThis.crypto || !globalThis.crypto.randomUUID) {
    Object.defineProperty(globalThis, "crypto", {
      value: { randomUUID: () => "00000000-0000-0000-0000-000000000000" },
      configurable: true,
    });
  }
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});


describe("useMessages — AI streaming reducers", () => {
  it("inserts a placeholder bubble on ai:started", () => {
    const { result } = renderHook(() => useMessages(CONV_ID, USER_ID));

    act(() => {
      result.current.onAiStreamStarted({
        message_id: MSG_ID,
        conversation_id: CONV_ID,
        sender_id: BOT_ID,
      });
    });

    const placeholder = result.current.messages.find((m) => m.id === MSG_ID);
    expect(placeholder).toBeDefined();
    expect(placeholder!.content).toBe("");
    expect(placeholder!.status).toBe("streaming");
    expect(placeholder!.sender_id).toBe(BOT_ID);
  });

  it("ignores duplicate ai:started events for the same message", () => {
    const { result } = renderHook(() => useMessages(CONV_ID, USER_ID));

    act(() => {
      result.current.onAiStreamStarted({
        message_id: MSG_ID,
        conversation_id: CONV_ID,
        sender_id: BOT_ID,
      });
      result.current.onAiStreamStarted({
        message_id: MSG_ID,
        conversation_id: CONV_ID,
        sender_id: BOT_ID,
      });
    });

    expect(
      result.current.messages.filter((m) => m.id === MSG_ID).length
    ).toBe(1);
  });

  it("appends delta text on ai:chunk", () => {
    const { result } = renderHook(() => useMessages(CONV_ID, USER_ID));

    act(() => {
      result.current.onAiStreamStarted({
        message_id: MSG_ID,
        conversation_id: CONV_ID,
        sender_id: BOT_ID,
      });
      result.current.onAiStreamChunk({ message_id: MSG_ID, delta: "Hello " });
      result.current.onAiStreamChunk({ message_id: MSG_ID, delta: "world" });
    });

    const msg = result.current.messages.find((m) => m.id === MSG_ID)!;
    expect(msg.content).toBe("Hello world");
    expect(msg.status).toBe("streaming");
  });

  it("swaps the placeholder for the final MessageDTO on ai:completed", () => {
    const { result } = renderHook(() => useMessages(CONV_ID, USER_ID));

    act(() => {
      result.current.onAiStreamStarted({
        message_id: MSG_ID,
        conversation_id: CONV_ID,
        sender_id: BOT_ID,
      });
      result.current.onAiStreamChunk({ message_id: MSG_ID, delta: "partial" });
      result.current.onAiStreamCompleted({
        id: MSG_ID,
        conversation_id: CONV_ID,
        sender_id: BOT_ID,
        content: "Final reply text.",
        content_type: "text",
        reactions: [],
        is_recalled: false,
        created_at: "2026-04-19T00:00:00Z",
      });
    });

    const msg = result.current.messages.find((m) => m.id === MSG_ID)!;
    expect(msg.content).toBe("Final reply text.");
    expect(msg.status).toBe("read");
  });

  it("ignores ai:chunk for unknown message ids", () => {
    const { result } = renderHook(() => useMessages(CONV_ID, USER_ID));

    act(() => {
      result.current.onAiStreamChunk({ message_id: "ghost", delta: "hi" });
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it("sends the active locale with AI streaming requests", async () => {
    const fetchMock = vi.fn<(
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => Promise<Response>>(async () => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("event: done\ndata: {}\n\n"));
          controller.close();
        },
      });
      return { ok: true, body } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useMessages(CONV_ID, USER_ID, { locale: "vi" }),
    );

    await act(async () => {
      await result.current.streamAiMessage(CONV_ID, "Mẹo để nhớ uống thuốc đều đặn");
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/conversations/${CONV_ID}/messages/stream`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(String(init?.body))).toMatchObject({
      content: "Mẹo để nhớ uống thuốc đều đặn",
      content_type: "text",
      locale: "vi",
    });
  });

  it("fills the assistant bubble when the SSE stream errors before any delta", async () => {
    const fallback = "Trợ lý AI tạm thời không phản hồi. Vui lòng thử lại sau.";
    const fetchMock = vi.fn<(
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => Promise<Response>>(async () => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(
            [
              `event: start\ndata: {"assistant_message_id":"${MSG_ID}"}\n\n`,
              'event: error\ndata: {"message_id":"msg-stream-1","detail":"AI proxy stream request failed."}\n\n',
            ].join(""),
          ));
          controller.close();
        },
      });
      return { ok: true, status: 200, body } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useMessages(CONV_ID, USER_ID, { locale: "vi" }),
    );

    await act(async () => {
      await result.current.streamAiMessage(CONV_ID, "hello");
    });

    const msg = result.current.messages.find((m) => m.id === MSG_ID);
    expect(msg).toBeDefined();
    expect(msg!.content).toBe(fallback);
    expect(msg!.status).toBe("failed");
  });
});
