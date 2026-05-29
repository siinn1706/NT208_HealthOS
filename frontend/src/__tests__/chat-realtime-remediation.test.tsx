import fs from "node:fs";
import path from "node:path";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import type { ComponentPropsWithoutRef, ComponentType, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MessageList } from "@/components/dashboard/chat/MessageList";
import {
  CHAT_UNREAD_REFRESH_EVENT,
  useMessages,
  useConversations,
} from "@/hooks/useChat";
import { useUnreadConversations } from "@/components/dashboard/shell/use-unread-conversations";
import type { Message } from "@/types/api";

const virtuosoHarness = vi.hoisted(() => ({
  forceNotAtBottomOnRender: false,
  scrollToIndex: vi.fn(),
}));

const bffFetchMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  bffFetch: bffFetchMock,
}));

interface MockVirtuosoHandle {
  scrollToIndex: (args: unknown) => void;
}

interface MockVirtuosoProps {
  scrollerRef?: (el: HTMLElement | Window | null) => void;
  components?: {
    Footer?: ComponentType;
    List?: ComponentType<ComponentPropsWithoutRef<"div">>;
  };
  totalCount?: number;
  firstItemIndex?: number;
  itemContent?: (index: number) => ReactNode;
  atBottomStateChange?: (atBottom: boolean) => void;
}

vi.mock("react-virtuoso", async () => {
  const React = await import("react");

  const MockVirtuoso = React.forwardRef<MockVirtuosoHandle, MockVirtuosoProps>(
    function MockVirtuoso(props, ref) {
      const scroller = React.useRef<HTMLDivElement>(null);

      React.useImperativeHandle(ref, () => ({
        scrollToIndex: virtuosoHarness.scrollToIndex,
      }));

      React.useLayoutEffect(() => {
        const el = scroller.current;
        if (!el) return;
        Object.defineProperty(el, "scrollHeight", { configurable: true, value: 1000 });
        Object.defineProperty(el, "clientHeight", { configurable: true, value: 300 });
        props.scrollerRef?.(el);
        if (virtuosoHarness.forceNotAtBottomOnRender) {
          props.atBottomStateChange?.(false);
        }
      });

      const List = props.components?.List ?? "div";
      const Footer = props.components?.Footer;
      const firstItemIndex = props.firstItemIndex ?? 0;
      const items = Array.from({ length: props.totalCount ?? 0 }, (_, offset) =>
        React.createElement(
          React.Fragment,
          { key: firstItemIndex + offset },
          props.itemContent?.(firstItemIndex + offset),
        ),
      );

      return React.createElement(
        "div",
        { ref: scroller, "data-testid": "message-list-scroller" },
        React.createElement(List, null, items),
        Footer ? React.createElement(Footer) : null,
      );
    },
  );

  return { Virtuoso: MockVirtuoso };
});

vi.mock("@/components/dashboard/chat/MessageBubble", () => ({
  MessageBubble: ({
    message,
    isAi,
    showTime,
  }: {
    message: Message;
    isAi: boolean;
    showTime?: boolean;
  }) => (
    <div
      data-testid={`message-${message.id}`}
      data-is-ai={String(isAi)}
      data-show-time={String(showTime)}
    >
      {message.content}
    </div>
  ),
}));

const conversation = {
  id: "conv-1",
  type: "direct",
  participants: [
    {
      user_id: "user-1",
      display_name: "One",
      email: "one@example.test",
      is_online: false,
      last_seen: null,
    },
    {
      user_id: "user-2",
      display_name: "Two",
      email: "two@example.test",
      is_online: false,
      last_seen: null,
    },
  ],
  unread_count: 3,
  last_message: {
    id: "msg-1",
    conversation_id: "conv-1",
    sender_id: "user-2",
    content: "hello",
    content_type: "text",
    reactions: [],
    created_at: "2026-05-28T00:00:00Z",
  },
  is_pinned: false,
  is_muted: false,
  theme_id: null,
  created_at: "2026-05-28T00:00:00Z",
  updated_at: "2026-05-28T00:00:00Z",
};

function mockConversationLoad() {
  bffFetchMock.mockImplementation(async (url: string) => {
    if (url === "/api/v1/conversations") return { data: [conversation] };
    return { data: {} };
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  bffFetchMock.mockReset();
  virtuosoHarness.forceNotAtBottomOnRender = false;
  virtuosoHarness.scrollToIndex.mockReset();
});

function message(overrides: Partial<Message>): Message {
  return {
    id: "msg-1",
    conversation_id: "conv-1",
    sender_id: "user-1",
    content: "hello",
    type: "text",
    status: "sent",
    reactions: [],
    is_edited: false,
    is_recalled: false,
    is_pinned: false,
    created_at: "2026-05-28T00:00:00Z",
    ...overrides,
  };
}

function renderMessageList(props: { messages: Message[]; isTyping: boolean }) {
  return (
    <MessageList
      conversationId="conv-1"
      messages={props.messages}
      currentUserId="user-1"
      participantNameById={{ "user-1": "One" }}
      isTyping={props.isTyping}
      onReply={vi.fn()}
      onEdit={vi.fn()}
      onRecall={vi.fn()}
      onDelete={vi.fn()}
      onPin={vi.fn()}
      onReact={vi.fn()}
    />
  );
}

describe("chat realtime remediation", () => {
  it("keeps the typing footer pinned when it expands below the last message", async () => {
    const originalScrollTo = HTMLElement.prototype.scrollTo;
    const scrollTo = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });

    try {
      const messages = [message({ id: "self-1", sender_id: "user-1", content: "Can you help?" })];
      const { rerender } = render(renderMessageList({ messages, isTyping: false }));

      virtuosoHarness.forceNotAtBottomOnRender = true;
      rerender(renderMessageList({ messages, isTyping: true }));

      await waitFor(() => {
        expect(scrollTo).toHaveBeenCalledWith(
          expect.objectContaining({ top: 1000, behavior: "smooth" }),
        );
      });
    } finally {
      Object.defineProperty(HTMLElement.prototype, "scrollTo", {
        configurable: true,
        value: originalScrollTo,
      });
    }
  });

  it("keeps the AI metadata row visible for grouped assistant replies", () => {
    const messages = [
      message({
        id: "ai-1",
        sender_id: "bot-1",
        sender_kind: "ai",
        content: "first",
        created_at: "2026-05-28T00:00:00Z",
      }),
      message({
        id: "ai-2",
        sender_id: "bot-1",
        sender_kind: "ai",
        content: "middle",
        created_at: "2026-05-28T00:01:00Z",
      }),
      message({
        id: "ai-3",
        sender_id: "bot-1",
        sender_kind: "ai",
        content: "last",
        created_at: "2026-05-28T00:02:00Z",
      }),
    ];

    render(renderMessageList({ messages, isTyping: false }));

    const groupedAiMessage = screen.getByTestId("message-ai-2");
    expect(groupedAiMessage).toHaveAttribute("data-is-ai", "true");
    expect(groupedAiMessage).toHaveAttribute("data-show-time", "true");
  });

  it("marks a conversation read through the BFF and invalidates unread badges", async () => {
    mockConversationLoad();
    const refresh = vi.fn();
    window.addEventListener(CHAT_UNREAD_REFRESH_EVENT, refresh);

    try {
      const { result } = renderHook(() => useConversations());
      await waitFor(() => expect(result.current.conversations).toHaveLength(1));

      await act(async () => {
        await result.current.markAsRead("conv-1", "msg-1");
      });

      expect(bffFetchMock).toHaveBeenCalledWith("/api/v1/conversations/conv-1/read", {
        method: "POST",
        body: { last_read_message_id: "msg-1" },
      });
      expect(result.current.conversations[0].unread_count).toBe(0);
      expect(refresh).toHaveBeenCalledTimes(2);
    } finally {
      window.removeEventListener(CHAT_UNREAD_REFRESH_EVENT, refresh);
    }
  });

  it("applies user.status payloads to every loaded participant match", async () => {
    mockConversationLoad();
    const { result } = renderHook(() => useConversations());
    await waitFor(() => expect(result.current.conversations).toHaveLength(1));

    act(() => {
      result.current.applyUserStatus({
        user_id: "user-2",
        is_online: true,
        last_seen_at: "2026-05-28T01:00:00Z",
      });
    });

    const participant = result.current.conversations[0].participants.find(
      (item) => item.user_id === "user-2",
    );
    expect(participant?.is_online).toBe(true);
    expect(participant?.last_seen).toBe("2026-05-28T01:00:00Z");
  });

  it("refreshes unread counts when the local realtime event fires", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ data: [{ unread_count: 2 }] }))
      .mockResolvedValueOnce(Response.json({ data: [{ unread_count: 0 }] }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useUnreadConversations(60_000));
    await waitFor(() => expect(result.current).toBe(2));

    act(() => {
      window.dispatchEvent(new CustomEvent(CHAT_UNREAD_REFRESH_EVENT));
    });

    await waitFor(() => expect(result.current).toBe(0));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the event aliases wired in the chat and shell sources", () => {
    const root = process.cwd();
    const chatWindow = fs.readFileSync(
      path.join(root, "src/components/dashboard/chat/ChatWindow.tsx"),
      "utf8",
    );
    const chatLayout = fs.readFileSync(
      path.join(root, "src/components/dashboard/chat/ChatLayout.tsx"),
      "utf8",
    );
    const appShell = fs.readFileSync(
      path.join(root, "src/components/dashboard/shell/AppShell.tsx"),
      "utf8",
    );
    const messageList = fs.readFileSync(
      path.join(root, "src/components/dashboard/chat/MessageList.tsx"),
      "utf8",
    );

    expect(chatWindow).toContain('"conversation.updated"');
    expect(chatWindow).toContain('"chat.conversation.updated"');
    expect(chatWindow).toContain('"user.status"');
    expect(appShell).toContain('"notification.created"');
    expect(appShell).toContain("CHAT_REALTIME_EVENT");
    expect(appShell).toContain('"healthos:notifications-refresh"');
    expect(chatLayout).toContain("SERVER_MESSAGE_ID_RE");
    expect(chatLayout).toContain("CHAT_REALTIME_EVENT");
    expect(messageList).toContain("prevIsTypingRef");
    expect(messageList).toContain("requestAnimationFrame");
  });

  it("keeps AI stream controls above suggestions and hides empty assistant placeholders", () => {
    const chatWindow = fs.readFileSync(
      path.join(process.cwd(), "src/components/dashboard/chat/ChatWindow.tsx"),
      "utf8",
    );

    const stopControlIndex = chatWindow.indexOf("Stop generation control");
    const quickRepliesIndex = chatWindow.indexOf("AI quick replies");
    expect(stopControlIndex).toBeGreaterThanOrEqual(0);
    expect(quickRepliesIndex).toBeGreaterThanOrEqual(0);
    expect(stopControlIndex).toBeLessThan(quickRepliesIndex);
    expect(chatWindow).toContain("const visibleMessages = useMemo(");
    expect(chatWindow).toContain('message.sender_kind === "ai"');
    expect(chatWindow).toContain("message.content.trim().length === 0");
    expect(chatWindow).toContain("messages={visibleMessages}");
  });

  it("updates conversation previews with the confirmed server id after send", async () => {
    bffFetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/v1/conversations/conv-1/messages?limit=50") {
        return { data: [], has_more: false, next_cursor: null };
      }
      if (url === "/api/v1/conversations/conv-1/messages") {
        return {
          data: {
            id: "11111111-1111-4111-8111-111111111111",
            conversation_id: "conv-1",
            sender_id: "user-1",
            content: "confirmed",
            content_type: "text",
            reactions: [],
            created_at: "2026-05-28T02:00:00Z",
          },
        };
      }
      return { data: [] };
    });
    const onMessageSent = vi.fn();
    const { result } = renderHook(() => useMessages("conv-1", "user-1"));
    await waitFor(() => expect(bffFetchMock).toHaveBeenCalledWith("/api/v1/conversations/conv-1/messages?limit=50"));

    await act(async () => {
      await result.current.sendMessage("conv-1", "confirmed", undefined, onMessageSent);
    });

    expect(onMessageSent).toHaveBeenCalledTimes(2);
    expect(onMessageSent.mock.calls[0][0].id).toMatch(/^optimistic-/);
    expect(onMessageSent.mock.calls[1][0].id).toBe("11111111-1111-4111-8111-111111111111");
  });
});
