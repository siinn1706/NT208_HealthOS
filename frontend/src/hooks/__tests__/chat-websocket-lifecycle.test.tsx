import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { WsStatus } from "../useChatWs";
import { useChatWs } from "../useChatWs";
import { useChatConvWs } from "../useChatConvWs";

type HookResult = {
  status: WsStatus;
  isReconnecting: boolean;
};

type HookCase = {
  name: string;
  useHook: () => HookResult;
};

class TestWebSocket {
  static instances: TestWebSocket[] = [];

  url: string;
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  send = vi.fn();

  constructor(url: string) {
    this.url = url;
    TestWebSocket.instances.push(this);
  }

  close = vi.fn(() => {
    this.readyState = 3;
  });

  closeFromServer(code = 1006) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

function okToken(token: string) {
  return Response.json({ data: { token } });
}

function failedToken() {
  return Response.json(
    { error: { code: "UPSTREAM_UNAVAILABLE", message: "Core unavailable." } },
    { status: 503 },
  );
}

function deferredToken() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function useGlobalChatWebSocket() {
  return useChatWs({ onEvent: vi.fn() });
}

function usePerConversationChatWebSocket() {
  return useChatConvWs({
    conversationId: "11111111-1111-4111-8111-111111111111",
    onEvent: vi.fn(),
  });
}

describe("chat websocket lifecycle", () => {
  const hookCases: HookCase[] = [
    {
      name: "global chat websocket",
      useHook: useGlobalChatWebSocket,
    },
    {
      name: "per-conversation chat websocket",
      useHook: usePerConversationChatWebSocket,
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    TestWebSocket.instances = [];
    vi.stubGlobal("WebSocket", TestWebSocket);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  for (const hookCase of hookCases) {
    describe(hookCase.name, () => {
      it("does not open a stale socket after cleanup wins the ticket race", async () => {
        const token = deferredToken();
        vi.stubGlobal("fetch", vi.fn().mockReturnValue(token.promise));

        const { unmount } = renderHook(hookCase.useHook);

        unmount();
        await act(async () => {
          token.resolve(okToken("ticket-after-cleanup"));
          await token.promise;
        });

        expect(TestWebSocket.instances).toHaveLength(0);
      });

      it("clears reconnecting state when a retry cannot mint a ws ticket", async () => {
        const fetchMock = vi
          .fn()
          .mockResolvedValueOnce(okToken("initial-ticket"))
          .mockResolvedValueOnce(failedToken());
        vi.stubGlobal("fetch", fetchMock);

        const { result } = renderHook(hookCase.useHook);

        await flushPromises();
        expect(TestWebSocket.instances).toHaveLength(1);

        act(() => {
          TestWebSocket.instances[0]?.closeFromServer(1006);
        });
        expect(result.current.isReconnecting).toBe(true);

        await act(async () => {
          vi.advanceTimersByTime(2000);
          await Promise.resolve();
        });

        expect(result.current.status).toBe("error");
        expect(result.current.isReconnecting).toBe(false);
      });
    });
  }
});
