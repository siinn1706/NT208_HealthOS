import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Platform, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useLocale, useT } from "@/i18n";
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
import { relative, type RelativeTimeLabels } from "@/utils/date";
import {
  formatChatDateSeparatorLabel,
  getConversationDisplayTitle,
  getMessageGroupPosition,
  isMessageActionSheetEligible,
  mergeVisibleChatMessages,
  shouldShowDateSeparatorBefore,
  shouldShowMessageTimestamp,
  shouldShowSenderLabel,
} from "@/utils/chat-presentation";
import { useThrottle } from "@/utils/debounce";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { ConversationRoomHeader } from "@/components/chat/ConversationRoomHeader";
import { ChatConnectionBanner } from "@/components/chat/ChatConnectionBanner";
import { PinnedStrip } from "@/components/chat/PinnedStrip";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { MessageActionSheet } from "@/components/chat/MessageActionSheet";

interface PendingMessage extends MessageDTO {
  __pending?: boolean;
  __failed?: boolean;
}

function uuid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ConversationRoomScreen() {
  const t = useT();
  const { locale } = useLocale();
  const toast = useToast();
  const qc = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const { colors, spacing, fontWeights, typography, radius } = useTheme();
  const params = useLocalSearchParams<{ conversationId: string }>();
  const conversationId = params.conversationId ?? "";
  const meId = sessionStore((s) => s.user?.id);
  const localeTag = locale === "vi" ? "vi-VN" : "en-US";

  const relativeLabels: RelativeTimeLabels = useMemo(
    () => ({
      justNow: t("chat.timeJustNow"),
      minutesAgo: (c: number) => t("chat.timeMinutesAgo", { count: c }),
      hoursAgo: (c: number) => t("chat.timeHoursAgo", { count: c }),
      daysAgo: (c: number) => t("chat.timeDaysAgo", { count: c }),
      olderThanOneWeek: (iso: string) =>
        new Date(iso).toLocaleDateString(localeTag, { month: "short", day: "numeric" }),
    }),
    [t, localeTag]
  );

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
  const [selectedMessage, setSelectedMessage] = useState<PendingMessage | null>(null);
  const listRef = useRef<FlatList<PendingMessage>>(null);

  const allServerMessages = useMemo(
    () => messages.data?.pages.flatMap((p) => p.data) ?? [],
    [messages.data]
  );

  const seenServerIds = useMemo(
    () => new Set(allServerMessages.map((m) => m.id)),
    [allServerMessages]
  );

  const merged: PendingMessage[] = useMemo(
    () => mergeVisibleChatMessages(allServerMessages, pendingMessages),
    [allServerMessages, pendingMessages]
  );

  const isGroup = conversation.data?.type === "group";

  const roomTitle = useMemo(() => {
    if (!conversation.data) return t("chat.fallbackTitle");
    return getConversationDisplayTitle(conversation.data, meId, {
      group: t("chat.groupFallback"),
      direct: t("chat.directFallback"),
    });
  }, [conversation.data, meId, t]);

  const handleWsEvent = useCallback(
    (event: string, payload: unknown) => {
      const p = payload as Record<string, unknown> | null;

      if (event === "error" && p) {
        const message = (p.message as string | undefined) ?? "Chat error";
        toast.error(message);
        return;
      }

      if (!p) return;

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

  const wsSendRef = useRef<((event: string, payload: unknown) => boolean) | null>(null);

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

  const displayTitle = conversation.data?.title ?? roomTitle;
  const bannerDotColor = !isOnline
    ? colors.textMuted
    : ws.connected
      ? colors.success
      : colors.warning;

  const roomChrome = conversation.isPending ? (
    <LoadingState />
  ) : conversation.isError ? (
    <ErrorState error={conversation.error} onRetry={() => conversation.refetch()} />
  ) : (
    <>
      <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.md }}>
        <ConversationRoomHeader
          title={displayTitle}
          titleStyle={{
            color: colors.text,
            fontSize: typography["xl"].fontSize,
            fontWeight: fontWeights.bold,
          }}
        />
        <ChatConnectionBanner
          isOnline={isOnline}
          wsConnected={ws.connected}
          offlineLabel={t("common.offline")}
          liveLabel={t("chat.live")}
          reconnectingLabel={t("chat.wsDisconnected")}
          dotColor={bannerDotColor}
          mutedColor={colors.textMuted}
          fontSize={typography.xs.fontSize}
          rowStyle={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.xs,
            marginTop: 2,
          }}
        />
      </View>

      {pinned.data && pinned.data.length > 0 ? (
        <PinnedStrip
          countLabel={t("chat.pinnedCount", { count: pinned.data.length })}
          preview={pinned.data[0]?.content ?? ""}
          surfaceStyle={{
            backgroundColor: colors.surfaceMuted,
            padding: spacing.sm,
            marginHorizontal: spacing.base,
            marginTop: spacing.sm,
            borderRadius: radius.md,
          }}
          countTextStyle={{
            color: colors.brand,
            fontSize: typography.xs.fontSize,
            fontWeight: fontWeights.semibold,
          }}
          previewTextStyle={{
            color: colors.textMuted,
            fontSize: typography.xs.fontSize,
          }}
        />
      ) : null}

      <View style={{ flex: 1 }}>
        {messages.isError ? (
          <ErrorState error={messages.error} onRetry={() => messages.refetch()} />
        ) : (
          <FlatList
            ref={listRef}
            data={merged}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={{
              padding: spacing.base,
              gap: spacing.xs,
              flexGrow: 1,
            }}
            onEndReached={() => {
              if (messages.hasNextPage && !messages.isFetchingNextPage) {
                messages.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.4}
            renderItem={({ item, index }) => {
              const isMine = item.sender_id === meId;
              const olderBelow = merged[index + 1];
              const newerAbove = merged[index - 1];
              const groupPosition = getMessageGroupPosition(olderBelow, item, newerAbove);
              const forceMetaStatus = !!item.__pending || !!item.__failed;
              const showTimestamp =
                forceMetaStatus || shouldShowMessageTimestamp(olderBelow, newerAbove, item);
              const showDateSeparator = shouldShowDateSeparatorBefore(item, olderBelow);
              const dateSeparatorLabel = showDateSeparator
                ? formatChatDateSeparatorLabel(
                    item.created_at,
                    { today: t("chat.dateToday"), yesterday: t("chat.dateYesterday") },
                    (d) =>
                      d.toLocaleDateString(localeTag, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                  )
                : "";

              const showSender = shouldShowSenderLabel(!!isGroup, !!isMine, olderBelow, item);
              const senderLabel = item.sender_display_name ?? "";

              const timeLabel = relative(item.created_at, relativeLabels);

              return (
                <View>
                  {showDateSeparator ? (
                    <Text
                      style={{
                        alignSelf: "center",
                        color: colors.textMuted,
                        fontSize: typography["2xs"].fontSize,
                        marginBottom: spacing.xs,
                        marginTop: spacing.sm,
                      }}
                    >
                      {dateSeparatorLabel}
                    </Text>
                  ) : null}
                  <MessageBubble
                    content={item.content}
                    isMine={!!isMine}
                    isRecalled={!!item.is_recalled}
                    recalledLabel={t("chat.deleted")}
                    pending={!!item.__pending}
                    failed={!!item.__failed}
                    maxWidth="78%"
                    alignSelf={isMine ? "flex-end" : "flex-start"}
                    groupPosition={groupPosition}
                    verticalSectionGap={spacing.xs}
                    showSenderLabel={showSender}
                    senderLabel={senderLabel}
                    senderLabelColor={colors.textMuted}
                    senderLabelSize={typography["2xs"].fontSize}
                    onLongPress={() => {
                      if (isMessageActionSheetEligible(item)) setSelectedMessage(item);
                    }}
                    bubbleStyle={{
                      backgroundColor: isMine ? colors.brand : colors.surface,
                      borderRadius: radius.md,
                      padding: spacing.sm,
                      borderWidth: isMine ? 0 : 1,
                      borderColor: colors.border,
                    }}
                    bodyColor={isMine ? colors.brandText : colors.text}
                    meta={{
                      edited: !!item.edited_at,
                      showTimestamp,
                      timeLabel,
                      editedLabel: t("chat.edited"),
                      isMine: !!isMine,
                      editedColor: isMine ? colors.brandText : colors.textMuted,
                      mutedColor: colors.textMuted,
                      fontSize: typography["2xs"].fontSize,
                      lineHeight: typography["2xs"].lineHeight,
                      pending: !!item.__pending,
                      failed: !!item.__failed,
                      pendingLabel: t("chat.messageSending"),
                      failedLabel: t("chat.messageFailed"),
                    }}
                    reactions={
                      item.reactions && item.reactions.length > 0
                        ? {
                            reactions: item.reactions,
                            textColor: isMine ? colors.brandText : colors.text,
                          }
                        : null
                    }
                  />
                </View>
              );
            }}
            ListEmptyComponent={
              messages.isPending ? (
                <LoadingState />
              ) : (
                <EmptyState title={t("chat.roomEmpty")} />
              )
            }
            ListFooterComponent={
              messages.isFetchingNextPage ? (
                <Text
                  style={{ color: colors.textMuted, textAlign: "center", padding: spacing.sm }}
                >
                  {t("chat.loadingMore")}
                </Text>
              ) : null
            }
          />
        )}
      </View>

      <ChatComposer
        draft={draft}
        onChangeDraft={setDraft}
        onSend={onSend}
        onTyping={onTyping}
        editing={!!editing}
        editingNotice={t("chat.editingNotice")}
        onCancelEdit={() => {
          setEditing(null);
          setDraft("");
        }}
        cancelLabel={t("common.cancel")}
        placeholder={t("chat.messagePlaceholder")}
        placeholderColor={colors.textMuted}
        sendLabel={t("chat.send")}
        canSend={draft.trim().length > 0}
        noticeStyle={{ color: colors.brand, fontSize: typography.xs.fontSize, flex: 1 }}
        cancelNoticeStyle={{ color: colors.danger, fontSize: typography.xs.fontSize }}
        shellStyle={[
          styles.composer,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.sm,
          },
        ]}
        inputStyle={{
          flex: 1,
          color: colors.text,
          backgroundColor: colors.surfaceMuted,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          maxHeight: 120,
        }}
        sendButtonStyle={{
          backgroundColor: draft.trim() ? colors.brand : colors.surfaceMuted,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
          minHeight: 44,
          justifyContent: "center",
        }}
        sendTextStyle={{
          color: draft.trim() ? colors.brandText : colors.textMuted,
          fontWeight: fontWeights.semibold,
        }}
        sendDisabledTextColor={colors.textMuted}
      />
    </>
  );

  return (
    <ScreenContainer edges={["top"]} keyboardAvoiding keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {roomChrome}
        {selectedMessage ? (
          <MessageActionSheet
            title={t("chat.messageActionsTitle")}
            message={selectedMessage}
            isMine={selectedMessage.sender_id === meId}
            onClose={() => setSelectedMessage(null)}
            onReact={(m, emoji) => onReact(m, emoji)}
            onEdit={(m) => {
              setEditing(m);
              setDraft(m.content);
            }}
            onDelete={(m) => onDelete(m)}
            onPinToggle={(m) => onPinToggle(m)}
            labels={{
              edit: t("chat.edit"),
              delete: t("chat.delete"),
              pin: t("chat.pin"),
              unpin: t("chat.unpin"),
            }}
            recalledHint={t("chat.recalledSheetHint")}
            serverActionsBlockedHint={t("chat.serverActionsBlockedHint")}
            closeLabel={t("common.close")}
            brandColor={colors.brand}
            dangerColor={colors.danger}
            mutedColor={colors.textMuted}
            surfaceColor={colors.surface}
            borderColor={colors.border}
            sheetCornerRadius={radius.md}
          />
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  composer: {
    borderTopWidth: 1,
  },
});
