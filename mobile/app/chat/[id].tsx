import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/theme/useTheme';
import { Composer } from '../../src/components/chat/composer';
import { AttachmentLinkModal } from '../../src/components/chat/attachment-link-modal';
import { ChatThreadHeader } from '../../src/components/chat/chat-thread-header';
import { ChatThreadOptionsModal } from '../../src/components/chat/chat-thread-options-modal';
import { ChatMessageList } from '../../src/components/chat/chat-message-list';
import { useApiQuery, invalidateApiQuery } from '../../src/api/query';
import { chatService } from '../../src/api/services';
import { queryKeys } from '../../src/api/queryKeys';
import { useSession } from '../../src/auth/session-provider';
import { useChatWebSocket } from '../../src/hooks/use-chat-websocket';
import { useChatReadReceipts } from '../../src/hooks/use-chat-read-receipts';
import { useChatFallbackPolling } from '../../src/hooks/use-chat-fallback-polling';
import { useChatThreadActions } from '../../src/hooks/use-chat-thread-actions';
import { mergeMessagesChronologically } from '../../src/chat/message-pagination';
import { getConversationDisplay } from '../../src/chat/conversation-display';
import type { Conversation, Message, MessageListResponse } from '../../../shared/api-contracts';

const CHAT_PAGE_SIZE = 50;

export default function AiConversationScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = (Array.isArray(id) ? id[0] : id) ?? '';
  const { user } = useSession();
  const loadMessages = useCallback(
    () => chatService.messages(conversationId, { limit: CHAT_PAGE_SIZE }),
    [conversationId],
  );
  const loadConversation = useCallback(
    () => chatService.conversation(conversationId),
    [conversationId],
  );
  const messageQuery = useApiQuery<MessageListResponse>(queryKeys.messages(conversationId), loadMessages, { enabled: Boolean(conversationId) });
  const conversationQuery = useApiQuery<Conversation>(queryKeys.conversation(conversationId), loadConversation, { enabled: Boolean(conversationId) });
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const appendMessage = useCallback((message: Message) => {
    setMessages((prev) => mergeMessagesChronologically(prev, [message]));
  }, []);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setHasMore(false);
      setNextCursor(null);
      setOlderError(null);
    }
  }, [conversationId]);

  const handleRealtimeMessage = useCallback((message: Message) => {
    appendMessage(message);
    invalidateApiQuery(queryKeys.conversations);
  }, [appendMessage]);

  const reloadMessages = messageQuery.reload;
  const reloadConversation = conversationQuery.reload;
  const reloadThread = useCallback(async () => {
    await Promise.all([reloadMessages(), reloadConversation()]);
  }, [reloadConversation, reloadMessages]);

  const realtime = useChatWebSocket({
    conversationId,
    enabled: Boolean(conversationId),
    onMessage: handleRealtimeMessage,
    onThreadEvent: () => { void reloadThread(); },
    onConversationRemoved: () => {
      invalidateApiQuery(queryKeys.conversations);
      router.back();
    },
  });

  useChatFallbackPolling({
    enabled: Boolean(conversationId),
    realtimeState: realtime.state,
    reload: reloadThread,
  });

  const conversationDisplay = useMemo(
    () => getConversationDisplay(conversationQuery.data, user?.id),
    [conversationQuery.data, user?.id],
  );

  const chatActions = useChatThreadActions({
    conversationId,
    isAiThread: conversationDisplay.isAi,
    canSend: Boolean(conversationQuery.data),
    reloadThread,
    appendMessage,
  });

  useEffect(() => {
    const page = messageQuery.data;
    if (chatActions.sending || !page) return;
    setMessages((prev) => mergeMessagesChronologically(prev, page.data));
    setHasMore(page.has_more);
    setNextCursor(page.next_cursor);
    setOlderError(null);
  }, [conversationId, messageQuery.data, chatActions.sending]);

  const handleLoadOlder = useCallback(async () => {
    if (!conversationId || !hasMore || !nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    setOlderError(null);
    try {
      const olderPage = await chatService.messages(conversationId, {
        before: nextCursor,
        limit: CHAT_PAGE_SIZE,
      });
      setMessages((prev) => mergeMessagesChronologically(olderPage.data, prev));
      setHasMore(olderPage.has_more);
      setNextCursor(olderPage.next_cursor);
    } catch (err: unknown) {
      setOlderError(err instanceof Error ? err.message : 'Failed to load older messages.');
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, hasMore, loadingOlder, nextCursor]);

  const latestMessageId = messages[messages.length - 1]?.id ?? null;
  useChatReadReceipts({
    conversationId,
    latestMessageId,
    enabled: Boolean(conversationId) && !messageQuery.isLoading && !messageQuery.error,
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <ChatThreadHeader
        display={conversationDisplay}
        realtimeState={realtime.state}
        onBack={() => router.back()}
        onMore={() => setMoreOpen(true)}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ChatMessageList
          messages={messages}
          currentUserId={user?.id}
          loading={messageQuery.isLoading}
          error={messageQuery.error}
          sending={chatActions.sending}
          sendError={chatActions.sendError}
          hasMore={hasMore}
          loadingOlder={loadingOlder}
          olderError={olderError}
          onRetry={() => { void messageQuery.reload(); }}
          onDismissSendError={chatActions.dismissSendError}
          onLoadOlder={() => { void handleLoadOlder(); }}
        />
        <Composer
          onSend={chatActions.handleSend}
          onAttach={chatActions.openAttachmentModal}
          disabled={!chatActions.canSend}
        />
      </KeyboardAvoidingView>

      <ChatThreadOptionsModal
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
        onRefresh={() => { void reloadThread(); setMoreOpen(false); }}
      />

      <AttachmentLinkModal
        visible={chatActions.attachOpen}
        submitting={chatActions.attaching}
        error={chatActions.attachError}
        onClose={chatActions.closeAttachmentModal}
        onSubmit={chatActions.handleSendAttachment}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
