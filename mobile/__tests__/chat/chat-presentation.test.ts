import {
  formatChatDateSeparatorLabel,
  getConversationDisplayTitle,
  getConversationListPreview,
  getMessageGroupPosition,
  isMessageActionSheetEligible,
  mergeVisibleChatMessages,
  shouldGroupMessages,
  shouldShowDateSeparatorBefore,
  shouldShowMessageTimestamp,
  shouldShowSenderLabel,
  truncateChatPreview,
} from "@/utils/chat-presentation";
import type { ConversationDTO, MessageDTO } from "@/api/endpoints/conversations";

describe("chat-presentation", () => {
  it("truncateChatPreview adds ellipsis beyond max", () => {
    expect(truncateChatPreview("1234567890", 4)).toBe("1234…");
    expect(truncateChatPreview("hi", 10)).toBe("hi");
  });

  it("getConversationDisplayTitle prefers title, then group/direct fallbacks", () => {
    const group: ConversationDTO = {
      id: "1",
      type: "group",
      participants: [],
      created_at: "",
      updated_at: "",
      title: "Team",
    };
    expect(getConversationDisplayTitle(group, "u1", { group: "G", direct: "D" })).toBe("Team");

    const untitledGroup: ConversationDTO = {
      id: "2",
      type: "group",
      participants: [],
      created_at: "",
      updated_at: "",
    };
    expect(getConversationDisplayTitle(untitledGroup, "u1", { group: "G", direct: "D" })).toBe("G");

    const direct: ConversationDTO = {
      id: "3",
      type: "direct",
      participants: [
        { id: "me", display_name: "Me" },
        { id: "them", display_name: "Alex" },
      ],
      created_at: "",
      updated_at: "",
    };
    expect(getConversationDisplayTitle(direct, "me", { group: "G", direct: "D" })).toBe("Alex");
  });

  it("getConversationListPreview handles recalled and you-prefix", () => {
    const base: ConversationDTO = {
      id: "1",
      type: "direct",
      participants: [],
      created_at: "",
      updated_at: "",
      last_message: {
        id: "m1",
        conversation_id: "1",
        sender_id: "me",
        content: "hello world",
        created_at: new Date().toISOString(),
      },
    };
    const labels = { recalled: "R", emptyDash: "—", youPrefix: "You: " };
    expect(getConversationListPreview(base, "me", labels)).toBe("You: hello world");
    expect(
      getConversationListPreview(
        {
          ...base,
          last_message: {
            ...base.last_message!,
            is_recalled: true,
          },
        },
        "me",
        labels
      )
    ).toBe("R");
  });

  it("groups same-sender messages within 60s", () => {
    const a = { sender_id: "u1", created_at: "2026-04-20T10:00:00Z" };
    const b = { sender_id: "u1", created_at: "2026-04-20T10:00:30Z" };
    expect(shouldGroupMessages(a, b)).toBe(true);
    const c = { sender_id: "u1", created_at: "2026-04-20T10:02:00Z" };
    expect(shouldGroupMessages(a, c)).toBe(false);
  });

  it("getMessageGroupPosition reflects newest-first adjacency", () => {
    const cur = { sender_id: "u1", created_at: "2026-04-20T10:01:00Z" };
    const older = { sender_id: "u1", created_at: "2026-04-20T10:00:30Z" };
    const newer = { sender_id: "u1", created_at: "2026-04-20T10:01:30Z" };
    expect(getMessageGroupPosition(older, cur, newer)).toBe("middle");
    expect(getMessageGroupPosition(null, cur, newer)).toBe("first");
    expect(getMessageGroupPosition(older, cur, null)).toBe("last");
  });

  it("shouldShowDateSeparatorBefore when calendar day changes", () => {
    const cur = { sender_id: "u1", created_at: "2026-04-20T10:00:00Z" };
    const older = { sender_id: "u1", created_at: "2026-04-19T10:00:00Z" };
    expect(shouldShowDateSeparatorBefore(cur, older)).toBe(true);
    expect(shouldShowDateSeparatorBefore(cur, { ...older, created_at: "2026-04-20T09:00:00Z" })).toBe(false);
  });

  it("shouldShowDateSeparatorBefore is true for oldest bucket (no olderBelow)", () => {
    const cur = { sender_id: "u1", created_at: "2026-04-18T10:00:00Z" };
    expect(shouldShowDateSeparatorBefore(cur, undefined)).toBe(true);
    expect(shouldShowDateSeparatorBefore(cur, null)).toBe(true);
  });

  it("formatChatDateSeparatorLabel returns today / yesterday / formatted", () => {
    const ref = new Date("2026-04-20T12:00:00Z");
    const labels = { today: "T", yesterday: "Y" };
    expect(
      formatChatDateSeparatorLabel("2026-04-20T08:00:00Z", labels, (d) => d.toISOString(), ref)
    ).toBe("T");
    expect(
      formatChatDateSeparatorLabel("2026-04-19T08:00:00Z", labels, (d) => d.toISOString(), ref)
    ).toBe("Y");
  });

  it("shouldShowSenderLabel for group non-self at cluster starts", () => {
    const cur = { sender_id: "u2", created_at: "2026-04-20T10:00:00Z" };
    const older = { sender_id: "u1", created_at: "2026-04-20T09:00:00Z" };
    expect(shouldShowSenderLabel(true, false, older, cur)).toBe(true);
    expect(shouldShowSenderLabel(true, true, older, cur)).toBe(false);
    expect(shouldShowSenderLabel(false, false, older, cur)).toBe(false);
  });

  it("shouldShowMessageTimestamp hides inside tight same-sender clusters", () => {
    const cur = { sender_id: "u1", created_at: "2026-04-20T10:00:00Z" };
    const older = { sender_id: "u1", created_at: "2026-04-20T09:56:00Z" };
    const newer = { sender_id: "u1", created_at: "2026-04-20T10:03:00Z" };
    expect(shouldShowMessageTimestamp(older, newer, cur)).toBe(false);
  });

  it("shouldGroupMessages returns false when a sender id is missing", () => {
    const a = { sender_id: "u1", created_at: "2026-04-20T10:00:00Z" };
    const b = { sender_id: undefined as unknown as string, created_at: "2026-04-20T10:00:30Z" };
    expect(shouldGroupMessages(a, b)).toBe(false);
  });

  it("getMessageGroupPosition is solo when neighbors are different senders", () => {
    const cur = { sender_id: "u2", created_at: "2026-04-20T10:01:00Z" };
    const older = { sender_id: "u1", created_at: "2026-04-20T10:00:30Z" };
    const newer = { sender_id: "u3", created_at: "2026-04-20T10:01:30Z" };
    expect(getMessageGroupPosition(older, cur, newer)).toBe("solo");
  });

  it("shouldShowSenderLabel is false when same sender still in same cluster", () => {
    const cur = { sender_id: "u2", created_at: "2026-04-20T10:01:00Z" };
    const older = { sender_id: "u2", created_at: "2026-04-20T10:00:30Z" };
    expect(shouldShowSenderLabel(true, false, older, cur)).toBe(false);
  });

  const msg = (over: Partial<MessageDTO> & { __pending?: boolean; __failed?: boolean }): MessageDTO & {
    __pending?: boolean;
    __failed?: boolean;
  } => ({
    id: over.id ?? "m",
    conversation_id: "c1",
    sender_id: "u1",
    content: "x",
    created_at: over.created_at ?? "2026-04-20T10:00:00Z",
    ...over,
  });

  it("mergeVisibleChatMessages keeps rapid pending sends newest-first", () => {
    const server: MessageDTO[] = [
      msg({ id: "s1", content: "server", created_at: "2026-04-20T09:00:00Z" }),
    ];
    const pendingNewestFirst = [
      msg({ id: "p2", content: "second", client_message_id: "c2", created_at: "2026-04-20T10:02:00Z", __pending: true }),
      msg({ id: "p1", content: "first", client_message_id: "c1", created_at: "2026-04-20T10:01:00Z", __pending: true }),
    ];
    const merged = mergeVisibleChatMessages(server, pendingNewestFirst);
    expect(merged.map((m) => m.content)).toEqual(["second", "first", "server"]);
  });

  it("mergeVisibleChatMessages drops pending when server already ACKed same client_message_id", () => {
    const server: MessageDTO[] = [
      msg({
        id: "srv",
        client_message_id: "cid",
        content: "acked",
        created_at: "2026-04-20T10:00:00Z",
      }),
    ];
    const pending = [
      msg({
        id: "tmp",
        client_message_id: "cid",
        content: "optimistic",
        __pending: true,
      }),
    ];
    const merged = mergeVisibleChatMessages(server, pending);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.id).toBe("srv");
  });

  it("isMessageActionSheetEligible is false for pending, failed, recalled", () => {
    expect(isMessageActionSheetEligible(msg({ __pending: true }))).toBe(false);
    expect(isMessageActionSheetEligible(msg({ __failed: true }))).toBe(false);
    expect(isMessageActionSheetEligible(msg({ is_recalled: true }))).toBe(false);
    expect(isMessageActionSheetEligible(msg({ id: "persisted" }))).toBe(true);
  });
});
