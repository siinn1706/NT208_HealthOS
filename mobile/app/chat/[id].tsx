import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, Modal, Pressable, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/theme/useTheme';
import { typography } from '../../src/theme/typography';
import { Bubble } from '../../src/components/chat/bubble';
import { DateChip } from '../../src/components/chat/date-chip';
import { Composer } from '../../src/components/chat/composer';
import { IconButton } from '../../src/components/primitives/icon-button';
import { ApiState, MissingApiState } from '../../src/components/api/api-state';
import { ChevronLeft, IconMore, IconRobot } from '../../src/icons';
import { useApiQuery, invalidateApiQuery } from '../../src/api/query';
import { chatService } from '../../src/api/services';
import { queryKeys } from '../../src/api/queryKeys';
import { toBubble } from '../../src/api/viewModels';
import { useSession } from '../../src/auth/session-provider';
import { useChatWebSocket } from '../../src/hooks/use-chat-websocket';
import { mergeMessagesChronologically } from '../../src/chat/message-pagination';
import type { Message, MessageListResponse } from '../../../shared/api-contracts';

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
  const messageQuery = useApiQuery<MessageListResponse>(queryKeys.messages(conversationId), loadMessages, { enabled: Boolean(conversationId) });
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // More options modal
  const [moreOpen, setMoreOpen] = useState(false);

  // Attach missing-API modal
  const [attachOpen, setAttachOpen] = useState(false);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setHasMore(false);
      setNextCursor(null);
      setOlderError(null);
    }
  }, [conversationId]);

  useEffect(() => {
    if (messageQuery.data && !sending) {
      setMessages(messageQuery.data.data);
      setHasMore(messageQuery.data.has_more);
      setNextCursor(messageQuery.data.next_cursor);
      setOlderError(null);
    }
  }, [messageQuery.data, sending]);

  const handleRealtimeMessage = useCallback((message: Message) => {
    setMessages((prev) => mergeMessagesChronologically(prev, [message]));
    invalidateApiQuery(queryKeys.conversations);
  }, []);

  const realtime = useChatWebSocket({
    conversationId,
    enabled: Boolean(conversationId),
    onMessage: handleRealtimeMessage,
  });

  async function handleSend(text: string) {
    if (!conversationId) return;
    setSending(true);
    setSendError(null);
    try {
      const saved = await chatService.sendMessage(conversationId, text);
      setMessages((prev) => mergeMessagesChronologically(prev, [saved]));
      invalidateApiQuery(queryKeys.conversations);
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  }

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

  // FlatList inverted: reverse messages so newest is at bottom (index 0 = newest)
  const reversed = useMemo(() => [...messages].reverse(), [messages]);

  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => (
      <Bubble {...toBubble(item, user?.id)} index={messages.length - 1 - index} />
    ),
    [messages.length, user?.id],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.border, backgroundColor: t.card }]}>
        <IconButton
          icon={<ChevronLeft size={22} color={t.ink} />}
          onPress={() => router.back()}
          accessibilityLabel="Back"
        />
        <View style={[styles.avatarWrap, { backgroundColor: t.brandSoft, borderRadius: t.radius.md }]}>
          <IconRobot size={20} color={t.brand} />
        </View>
        <View style={styles.headerInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[typography.h3, { color: t.ink, fontSize: 16, fontWeight: '700' }]}>HealthOS AI</Text>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: realtime.isLive ? t.success : t.warning }} />
          </View>
          <Text style={[typography.micro, { color: t.ink3 }]}>
            {realtime.isLive ? 'Live updates' : 'REST fallback'} · Never medical advice
          </Text>
        </View>
        <IconButton
          icon={<IconMore size={20} color={t.ink3} />}
          accessibilityLabel="More"
          onPress={() => setMoreOpen(true)}
        />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {messageQuery.isLoading && (
          <ApiState title="Loading messages" loading />
        )}
        {messageQuery.error && (
          <ApiState
            title="Messages unavailable"
            message={messageQuery.error.message}
            actionLabel="Retry"
            onAction={messageQuery.reload}
          />
        )}
        {!messageQuery.isLoading && !messageQuery.error && messages.length === 0 && !sending && (
          <ApiState title="No messages yet" message="Start the conversation below." />
        )}
        {sendError && (
          <ApiState
            title="Send failed"
            message={sendError}
            actionLabel="Dismiss"
            onAction={() => setSendError(null)}
          />
        )}
        <FlatList
          data={reversed}
          inverted
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          initialNumToRender={15}
          windowSize={10}
          maxToRenderPerBatch={10}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={sending ? <Bubble side="me" isTyping /> : null}
          ListFooterComponent={(
            <View style={styles.historyFooter}>
              {hasMore && (
                <Pressable
                  style={[styles.loadOlderBtn, { borderColor: t.border, backgroundColor: t.card }]}
                  onPress={handleLoadOlder}
                  disabled={loadingOlder}
                >
                  <Text style={[typography.caption, { color: t.ink }]}>
                    {loadingOlder ? 'Loading earlier messages...' : 'Load earlier messages'}
                  </Text>
                </Pressable>
              )}
              {olderError && (
                <Text style={[typography.micro, { color: t.danger, textAlign: 'center', marginBottom: 8 }]}>
                  {olderError}
                </Text>
              )}
              <DateChip label="Today" />
            </View>
          )}
          contentContainerStyle={styles.messages}
        />
        <Composer
          onSend={handleSend}
          onAttach={() => setAttachOpen(true)}
        />
      </KeyboardAvoidingView>

      {/* More options modal */}
      <Modal
        visible={moreOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMoreOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: t.card, borderRadius: t.radius.xl }]}>
            <Text style={[typography.h3, { color: t.ink, marginBottom: 16 }]}>Options</Text>
            <Pressable
              onPress={() => { messageQuery.reload(); setMoreOpen(false); }}
              style={[styles.optionBtn, { borderColor: t.border, borderRadius: t.radius.md }]}
            >
              <Text style={[typography.bodyMed, { color: t.ink }]}>Refresh</Text>
            </Pressable>
            <Pressable
              onPress={() => setMoreOpen(false)}
              style={[styles.optionBtn, { borderColor: t.border, borderRadius: t.radius.md, marginTop: 8 }]}
            >
              <Text style={[typography.bodyMed, { color: t.ink3 }]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Attach file missing-API modal */}
      <Modal
        visible={attachOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAttachOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: t.card, borderRadius: t.radius.xl }]}>
            <MissingApiState
              title="Attach file"
              contract="File attachment API pending"
            />
            <Pressable
              onPress={() => setAttachOpen(false)}
              style={[styles.closeBtn, { backgroundColor: t.brand, borderRadius: t.radius.pill }]}
            >
              <Text style={[typography.bodyMed, { color: '#FFF' }]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  avatarWrap:   { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerInfo:   { flex: 1 },
  messages:     { paddingHorizontal: 16, paddingBottom: 16 },
  historyFooter:{ alignItems: 'center', marginTop: 8, gap: 6 },
  loadOlderBtn: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth, borderRadius: 999 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalSheet:   { width: '100%', padding: 20 },
  optionBtn:    { paddingVertical: 14, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  closeBtn:     { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
});
