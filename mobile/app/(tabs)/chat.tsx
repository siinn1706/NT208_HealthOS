import React, { useCallback, useState } from 'react';
import { Modal, Pressable, TextInput, View, StyleSheet, Text } from 'react-native';
import { Screen } from '../../src/components/layout/Screen';
import { TopBar } from '../../src/components/layout/TopBar';
import { SectionHeader } from '../../src/components/layout/SectionHeader';
import { IconButton } from '../../src/components/primitives/IconButton';
import { ApiState, MissingApiState } from '../../src/components/api/ApiState';
import { ChatListSkeleton } from '../../src/components/api/Skeletons';
import { AiAssistantHero } from '../../src/components/chat/AiAssistantHero';
import { ConversationRow } from '../../src/components/chat/ConversationRow';
import { IconSearch, IconPlus } from '../../src/icons';
import { useTheme } from '../../src/theme/useTheme';
import { router } from 'expo-router';
import { invalidateApiQuery, useApiQuery } from '../../src/api/query';
import { chatService } from '../../src/api/services';
import { queryKeys } from '../../src/api/queryKeys';
import { toConversationRow } from '../../src/api/viewModels';
import { useSession } from '../../src/auth/SessionProvider';
import { typography } from '../../src/theme/typography';

const AI_SUGGESTIONS = [
  'How am I doing today?',
  'Summarize my health this week',
  'What medications do I have today?',
];

export default function ChatScreen() {
  const t = useTheme();
  const { user } = useSession();
  const loadConversations = useCallback(() => chatService.conversations(), []);
  const conversations = useApiQuery(queryKeys.conversations, loadConversations);
  const aiConversation = conversations.data?.find((c) => c.type === 'ai');

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  // New chat modal state
  const [newChatOpen, setNewChatOpen] = useState(false);

  const [creatingAi, setCreatingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const allRows = (conversations.data ?? []).map((c) => toConversationRow(c, user?.id));
  const filteredRows = searchOpen && searchText.trim()
    ? allRows.filter((row) =>
        row.name?.toLowerCase().includes(searchText.toLowerCase())
      )
    : allRows;

  async function openAiConversation(initialMessage?: string) {
    if (aiConversation) {
      router.push(`/chat/${aiConversation.id}` as never);
      return;
    }
    if (creatingAi) return;
    setCreatingAi(true);
    setAiError(null);
    try {
      const created = await chatService.createAiConversation(initialMessage);
      invalidateApiQuery(queryKeys.conversations);
      router.push(`/chat/${created.id}` as never);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Could not open AI conversation.');
    } finally {
      setCreatingAi(false);
    }
  }

  function handleSuggestionPress(text: string) {
    openAiConversation(text);
  }

  return (
    <Screen>
      <TopBar
        title="Chat"
        subtitle="Care team & AI assistant"
        right={
          <View style={styles.actions}>
            <IconButton
              icon={<IconSearch size={20} color={t.ink3} />}
              accessibilityLabel="Search"
              onPress={() => {
                setSearchOpen((v) => !v);
                if (searchOpen) setSearchText('');
              }}
            />
            <IconButton
              icon={<IconPlus size={20} color={t.brand} />}
              variant="filled"
              accessibilityLabel="New chat"
              onPress={() => setNewChatOpen(true)}
            />
          </View>
        }
      />

      {/* Inline search bar */}
      {searchOpen && (
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search conversations…"
          placeholderTextColor={t.ink4}
          autoFocus
          style={[
            styles.searchInput,
            { color: t.ink, backgroundColor: t.bgElev, borderColor: t.border, borderRadius: t.radius.pill },
          ]}
          clearButtonMode="while-editing"
        />
      )}

      <AiAssistantHero
        suggestions={AI_SUGGESTIONS}
        onPress={() => openAiConversation()}
        onSuggestion={(text) => openAiConversation(text)}
        onSuggestionPress={handleSuggestionPress}
      />
      {creatingAi && <ApiState title="Starting AI conversation" loading />}
      {aiError && (
        <ApiState
          title="AI conversation unavailable"
          message={aiError}
          actionLabel="Retry"
          onAction={() => openAiConversation()}
        />
      )}

      <SectionHeader title="Conversations" />
      {conversations.isLoading && (
        <ApiState title="Loading conversations" loading skeleton={<ChatListSkeleton />} />
      )}
      {conversations.error && (
        <ApiState
          title="Conversations unavailable"
          message={conversations.error.message}
          actionLabel="Retry"
          onAction={conversations.reload}
        />
      )}
      {!conversations.isLoading && !conversations.error && conversations.data?.length === 0 && (
        <ApiState title="No conversations" message="Accepted care-team and AI conversations will appear here." />
      )}
      {filteredRows.map((row) => (
        <ConversationRow
          key={row.id}
          {...row}
          onPress={() => router.push(`/chat/${row.id}` as never)}
        />
      ))}

      {/* New chat modal */}
      <Modal
        visible={newChatOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNewChatOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: t.card, borderRadius: t.radius.xl }]}>
            <MissingApiState
              title="Start new conversation"
              contract="Create conversation API not yet available."
            />
            <Pressable
              onPress={() => setNewChatOpen(false)}
              style={[styles.closeBtn, { backgroundColor: t.brand, borderRadius: t.radius.pill }]}
            >
              <Text style={[typography.bodyMed, { color: '#FFF' }]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions:      { flexDirection: 'row', gap: 4 },
  searchInput:  { marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalSheet:   { width: '100%', padding: 20 },
  closeBtn:     { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
});
