import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { sessionStore } from "@/auth/session";
import {
  deleteMessage,
  editMessage,
  getConversation,
  listMessages,
  listPinned,
  markRead,
  type MessageDTO,
  pinMessage,
  reactToMessage,
  sendMessage,
  unpinMessage,
} from "@/api/endpoints/conversations";
import { ApiError } from "@/api/errors";
import { useChatSocket } from "@/api/ws/useChatSocket";
import { relative } from "@/utils/date";
import { useThrottle } from "@/utils/debounce";

interface PendingMessage extends MessageDTO {
  __pending?: boolean;
  __failed?: boolean;
}

const REACTIONS = ["👍", "❤️", "🎉", "🤔", "😂"];

function uuid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ConversationRoomScreen() {
  const t = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const { colors, spacing, fontWeights, typography, radius } = useTheme();
  const params = useLocalSearchParams<{ conversationId: string }>();
  const conversationId = params.conversationId ?? "";
  const meId = sessionStore((s) => s.user?.id);

  const conversation = useQuery({
    queryKey: ["conversation", conversationId],
    enabled: !!conversationId,
    queryFn: () => getConversation(conversationId),
  });

  const messages = useInfiniteQuery({
    queryKey: ["messages", conversationId],
    enabled: !!conversationId,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listMessages(conversationId, { before: pageParam, limit: 50 }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });

  const pinned = useQuery({
    queryKey: ["pinned", conversationId],
    enabled: !!conversationId,
    queryFn: () => listPinned(conversationId),
  });

  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<MessageDTO | null>(null);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null);
  const listRef = useRef<FlatList<PendingMessage>>(null);

  const allServerMessages = useMemo(
    () => messages.data?.pages.flatMap((p) => p.data) ?? [],
    [messages.data]
  );

  const seenServerIds = useMemo(
    () => new Set(allServerMessages.map((m) => m.id)),
    [allServerMessages]
  );

  const merged: PendingMessage[] = useMemo(() => {
    const visible: PendingMessage[] = [];
    const seenClient = new Set<string>();
    for (const m of allServerMessages) {
      visible.push(m);
      if (m.client_message_id) seenClient.add(m.client_message_id);
    }
    for (const p of pendingMessages) {
      if (p.client_message_id && seenClient.has(p.client_message_id)) continue;
      visible.unshift(p);
    }
    return visible;
  }, [allServerMessages, pendingMessages]);

  const wsSendRef = useRef<((event: string, payload: unknown) => boolean) | null>(null);
  const handleWsEvent = useCallback(
    (event: string, payload: unknown) => {
      const p = payload as Record<string, unknown> | null;

      // Surface server-rejected events to the user via toast.
      if (event === "error" && p) {
        const message = (p.message as string | undefined) ?? "Chat error";
        toast.error(message);
        return;
      }

      if (!p) return;

      // Backend emits past-tense legacy event names for pin/unpin.
      // Per [chat_router.py](backend/app/ws/chat_router.py): broadcast_dual(..., "msg:pinned", "chat.message.pinned").
      const eventNames = new Set([
        "msg:new",
        "chat.message.sent",
        "msg:edit",
        "chat.message.edited",
        "msg:delete",
        "chat.message.recalled",
        "msg:react",
        "chat.message.reacted",
        "msg:pinned",
        "chat.message.pinned",
        "msg:unpinned",
        "chat.message.unpinned",
        "msg:read",
        "chat.message.read",
        "msg:ack",
      ]);
      if (!eventNames.has(event)) return;

      const convId =
        (p.conversation_id as string | undefined) ??
        ((p.message as Record<string, unknown> | undefined)?.conversation_id as
          | string
          | undefined);
      if (convId && convId !== conversationId) return;

      if (event === "msg:ack") {
        const clientId = p.client_message_id as string | undefined;
        const serverId = p.server_message_id as string | undefined;
        const createdAt = p.created_at as string | undefined;
        if (clientId) {
          setPendingMessages((cur) =>
            cur.map((m) =>
              m.client_message_id === clientId
                ? {
                    ...m,
                    id: serverId ?? m.id,
                    created_at: createdAt ?? m.created_at,
                    __pending: false,
                  }
                : m
            )
          );
        }
        qc.invalidateQueries({ queryKey: ["messages", conversationId] });
        return;
      }

      if (event.includes("pin")) {
        qc.invalidateQueries({ queryKey: ["pinned", conversationId] });
      }
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
    [conversationId, qc, toast]
  );

  const ws = useChatSocket({
    conversationId,
    onEvent: handleWsEvent,
  });

  useEffect(() => {
    wsSendRef.current = ws.send;
  }, [ws.send]);

  const send = useMutation({
    mutationFn: ({ content, clientId }: { content: string; clientId: string }) =>
      sendMessage(conversationId, { content, client_message_id: clientId }),
    onError(err, variables) {
      setPendingMessages((cur) =>
        cur.map((m) =>
          m.client_message_id === variables.clientId
            ? { ...m, __failed: true, __pending: false }
            : m
        )
      );
      toast.error(err instanceof ApiError ? err.message : t("chat.couldNotSend"));
    },
    onSuccess(message) {
      setPendingMessages((cur) =>
        cur.filter((m) => m.client_message_id !== message.client_message_id)
      );
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });

  const onSend = () => {
    const content = draft.trim();
    if (!content) return;
    if (editing) {
      submitEdit(content);
      return;
    }
    const clientId = uuid();
    const optimistic: PendingMessage = {
      id: clientId,
      conversation_id: conversationId,
      sender_id: meId ?? "",
      content,
      content_type: "text",
      client_message_id: clientId,
      created_at: new Date().toISOString(),
      __pending: true,
    };
    setPendingMessages((cur) => [optimistic, ...cur]);
    setDraft("");

    const wsSent = ws.connected
      ? wsSendRef.current?.("msg:send", {
          conversation_id: conversationId,
          content,
          client_message_id: clientId,
        }) ?? false
      : false;
    if (!wsSent) {
      send.mutate({ content, clientId });
    }
  };

  const submitEdit = async (content: string) => {
    if (!editing) return;
    try {
      await editMessage(conversationId, editing.id, content);
      setEditing(null);
      setDraft("");
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("chat.couldNotEdit"));
    }
  };

  const onDelete = async (m: MessageDTO) => {
    try {
      await deleteMessage(conversationId, m.id, true);
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
    } catch {
      toast.error(t("chat.couldNotDelete"));
    }
  };

  const onPinToggle = async (m: MessageDTO) => {
    try {
      if (m.is_pinned) {
        await unpinMessage(conversationId, m.id);
      } else {
        await pinMessage(conversationId, m.id);
      }
      qc.invalidateQueries({ queryKey: ["pinned", conversationId] });
    } catch {
      toast.error(t("chat.couldNotPin"));
    }
  };

  const onReact = async (m: MessageDTO, emoji: string) => {
    try {
      await reactToMessage(conversationId, m.id, emoji);
      setShowReactionsFor(null);
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
    } catch {
      toast.error(t("chat.couldNotReact"));
    }
  };

  const onTyping = useThrottle(() => {
    if (ws.connected) {
      wsSendRef.current?.("typing", { conversation_id: conversationId });
    }
  }, 1500);

  const markReadThrottled = useThrottle((messageId: string) => {
    if (!messageId || !seenServerIds.has(messageId)) return;
    markRead(conversationId, messageId).catch(() => undefined);
  }, 1000);

  useEffect(() => {
    if (allServerMessages.length > 0) {
      const newest = allServerMessages[0];
      if (newest) markReadThrottled(newest.id);
    }
  }, [allServerMessages, markReadThrottled]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: typography["xl"].fontSize, fontWeight: fontWeights.bold }}>
            {conversation.data?.title ?? t("chat.fallbackTitle")}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: 2 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: radius.xs,
                backgroundColor: ws.connected ? colors.success : colors.warning,
              }}
            />
            <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>
              {!isOnline
                ? t("common.offline")
                : ws.connected
                  ? t("chat.live")
                  : t("chat.wsDisconnected")}
            </Text>
          </View>
        </View>

        {pinned.data && pinned.data.length > 0 ? (
          <View
            style={{
              backgroundColor: colors.surfaceMuted,
              padding: spacing.sm,
              marginHorizontal: spacing.base,
              marginTop: spacing.sm,
              borderRadius: radius.md,
            }}
          >
            <Text style={{ color: colors.brand, fontSize: typography.xs.fontSize, fontWeight: fontWeights.semibold }}>
              📌 {t("chat.pinnedCount", { count: pinned.data.length })}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }} numberOfLines={1}>
              {pinned.data[0]?.content}
            </Text>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={merged}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={{ padding: spacing.base, gap: spacing.xs }}
          onEndReached={() => {
            if (messages.hasNextPage && !messages.isFetchingNextPage) {
              messages.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => {
            const isMine = item.sender_id === meId;
            return (
              <Pressable
                onLongPress={() => setShowReactionsFor(item.id)}
                style={{
                  alignSelf: isMine ? "flex-end" : "flex-start",
                  maxWidth: "78%",
                }}
              >
                <View
                  style={{
                    backgroundColor: isMine ? colors.brand : colors.surface,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                    borderWidth: isMine ? 0 : 1,
                    borderColor: colors.border,
                    opacity: item.__pending ? 0.6 : item.__failed ? 0.4 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: isMine ? colors.brandText : colors.text,
                    }}
                  >
                    {item.is_recalled ? `[${t("chat.deleted")}]` : item.content}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: spacing.xs,
                      marginTop: spacing.xs,
                    }}
                  >
                    {item.edited_at ? (
                      <Text
                        style={{
                          color: isMine ? colors.brandText : colors.textMuted,
                          fontSize: typography["2xs"].fontSize,
                          lineHeight: typography["2xs"].lineHeight,
                        }}
                      >
                        {t("chat.edited")}
                      </Text>
                    ) : null}
                    <Text
                      style={{
                        color: isMine ? colors.brandText : colors.textMuted,
                        fontSize: typography["2xs"].fontSize,
                        lineHeight: typography["2xs"].lineHeight,
                      }}
                    >
                      {relative(item.created_at)}
                    </Text>
                  </View>
                  {item.reactions && item.reactions.length > 0 ? (
                    <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
                      {Object.entries(
                        item.reactions.reduce<Record<string, number>>((acc, r) => {
                          acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                          return acc;
                        }, {})
                      ).map(([emoji, count]) => (
                        <Text key={emoji} style={{ color: isMine ? colors.brandText : colors.text }}>
                          {emoji} {count}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
                {showReactionsFor === item.id ? (
                  <View
                    style={{
                      flexDirection: "row",
                      gap: spacing.xs,
                      marginTop: 6,
                      backgroundColor: colors.surface,
                      borderRadius: radius.pill,
                      padding: spacing.xs,
                      alignSelf: isMine ? "flex-end" : "flex-start",
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    {REACTIONS.map((emoji) => (
                      <Pressable
                        key={emoji}
                        onPress={() => onReact(item, emoji)}
                        hitSlop={4}
                      >
                        <Text style={{ fontSize: 18 }}>{emoji}</Text>
                      </Pressable>
                    ))}
                    {isMine && !item.is_recalled ? (
                      <>
                        <Pressable
                          onPress={() => {
                            setEditing(item);
                            setDraft(item.content);
                            setShowReactionsFor(null);
                          }}
                          hitSlop={4}
                        >
                          <Text style={{ color: colors.brand, fontWeight: fontWeights.semibold }}>
                            {t("chat.edit")}
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => onDelete(item)} hitSlop={4}>
                          <Text style={{ color: colors.danger, fontWeight: fontWeights.semibold }}>
                            {t("chat.delete")}
                          </Text>
                        </Pressable>
                      </>
                    ) : null}
                    <Pressable onPress={() => onPinToggle(item)} hitSlop={4}>
                      <Text style={{ color: colors.brand }}>
                        {item.is_pinned ? t("chat.unpin") : t("chat.pin")}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
          ListFooterComponent={
            messages.isFetchingNextPage ? (
              <Text style={{ color: colors.textMuted, textAlign: "center", padding: spacing.sm }}>
                {t("chat.loadingMore")}
              </Text>
            ) : null
          }
        />

        <View
          style={[
            styles.composer,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.surface,
              paddingHorizontal: spacing.base,
              paddingVertical: spacing.sm,
            },
          ]}
        >
          {editing ? (
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <Text style={{ color: colors.brand, fontSize: typography.xs.fontSize, flex: 1 }}>
                {t("chat.editingNotice")}
              </Text>
              <Pressable onPress={() => { setEditing(null); setDraft(""); }} hitSlop={6}>
                <Text style={{ color: colors.danger, fontSize: typography.xs.fontSize }}>
                  {t("common.cancel")}
                </Text>
              </Pressable>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing.sm }}>
            <TextInput
              style={{
                flex: 1,
                color: colors.text,
                backgroundColor: colors.surfaceMuted,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                maxHeight: 120,
              }}
              placeholder={t("chat.messagePlaceholder")}
              placeholderTextColor={colors.textMuted}
              value={draft}
              onChangeText={(text) => {
                setDraft(text);
                onTyping();
              }}
              multiline
            />
            <Pressable
              onPress={onSend}
              disabled={!draft.trim()}
              accessibilityRole="button"
              accessibilityLabel={t("chat.send")}
              accessibilityState={{ disabled: !draft.trim() }}
              style={{
                backgroundColor: draft.trim() ? colors.brand : colors.surfaceMuted,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.md,
                minHeight: 44,
                justifyContent: "center",
              }}
            >
              <Text style={{ color: draft.trim() ? colors.brandText : colors.textMuted, fontWeight: fontWeights.semibold }}>
                {t("chat.send")}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  composer: {
    borderTopWidth: 1,
  },
});
