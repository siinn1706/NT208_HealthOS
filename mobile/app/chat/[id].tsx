import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Modal, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/theme/useTheme';
import { typography } from '../../src/theme/typography';
import { Bubble } from '../../src/components/chat/Bubble';
import { DateChip } from '../../src/components/chat/DateChip';
import { Composer } from '../../src/components/chat/Composer';
import { IconButton } from '../../src/components/primitives/IconButton';
import { ApiState, MissingApiState } from '../../src/components/api/ApiState';
import { ChevronLeft, IconMore, IconRobot } from '../../src/icons';
import { useApiQuery, invalidateApiQuery } from '../../src/api/query';
import { chatService } from '../../src/api/services';
import { queryKeys } from '../../src/api/queryKeys';
import { toBubble } from '../../src/api/viewModels';
import { useSession } from '../../src/auth/SessionProvider';
import type { Message } from '../../../shared/api-contracts';

export default function AiConversationScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = (Array.isArray(id) ? id[0] : id) ?? '';
  const { user } = useSession();
  const loadMessages = useCallback(() => chatService.messages(conversationId), [conversationId]);
  const messageQuery = useApiQuery<Message[]>(queryKeys.messages(conversationId), loadMessages, { enabled: Boolean(conversationId) });
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  // More options modal
  const [moreOpen, setMoreOpen] = useState(false);

  // Attach missing-API modal
  const [attachOpen, setAttachOpen] = useState(false);

  useEffect(() => {
    setMessages(messageQuery.data ?? []);
  }, [messageQuery.data]);

  async function handleSend(text: string) {
    if (!conversationId) return;
    setSending(true);
    setSendError(null);
    try {
      const saved = await chatService.sendMessage(conversationId, text);
      setMessages((prev) => [...prev, saved]);
      setDraft('');
      invalidateApiQuery(queryKeys.conversations);
      invalidateApiQuery(queryKeys.messages(conversationId));
      await messageQuery.reload();
    } catch (err: unknown) {
      // Restore draft so the user doesn't lose their message
      setDraft(text);
      setSendError(err instanceof Error ? err.message : 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  }

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
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.success }} />
          </View>
          <Text style={[typography.micro, { color: t.ink3 }]}>Always private · Never medical advice</Text>
        </View>
        <IconButton
          icon={<IconMore size={20} color={t.ink3} />}
          accessibilityLabel="More"
          onPress={() => setMoreOpen(true)}
        />
      </View>

      {/* Messages */}
      <ScrollView
        contentContainerStyle={styles.messages}
        showsVerticalScrollIndicator={false}
      >
        <DateChip label="Today" />
        {messageQuery.isLoading && <ApiState title="Loading messages" loading />}
        {messageQuery.error && (
          <ApiState
            title="Messages unavailable"
            message={messageQuery.error.message}
            actionLabel="Retry"
            onAction={messageQuery.reload}
          />
        )}
        {!messageQuery.isLoading && !messageQuery.error && messages.length === 0 && (
          <ApiState title="No messages yet" message="Start the conversation below." />
        )}
        {messages.map((m, i) => (
          <Bubble key={m.id} {...toBubble(m, user?.id)} index={i} />
        ))}
        {sending && <Bubble side="me" isTyping />}
        {sendError && (
          <ApiState
            title="Send failed"
            message={sendError}
            actionLabel="Dismiss"
            onAction={() => setSendError(null)}
          />
        )}
      </ScrollView>

      <Composer
        onSend={handleSend}
        onAttach={() => setAttachOpen(true)}
      />

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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalSheet:   { width: '100%', padding: 20 },
  optionBtn:    { paddingVertical: 14, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  closeBtn:     { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
});
