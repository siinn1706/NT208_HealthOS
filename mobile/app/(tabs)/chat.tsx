import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, TextInput, View, StyleSheet, Text } from 'react-native';
import { Screen } from '../../src/components/layout/screen';
import { TopBar } from '../../src/components/layout/top-bar';
import { SectionHeader } from '../../src/components/layout/section-header';
import { IconButton } from '../../src/components/primitives/icon-button';
import { ApiState, MissingApiState } from '../../src/components/api/api-state';
import { ChatListSkeleton } from '../../src/components/api/skeletons';
import { AiAssistantHero } from '../../src/components/chat/ai-assistant-hero';
import { ConversationRow } from '../../src/components/chat/conversation-row';
import { IconSearch, IconPlus } from '../../src/icons';
import { useTheme } from '../../src/theme/useTheme';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { invalidateApiQuery, useApiQuery } from '../../src/api/query';
import { chatService } from '../../src/api/services';
import { queryKeys } from '../../src/api/queryKeys';
import { toConversationRow } from '../../src/api/viewModels';
import { humanizeError } from '../../src/api/error-message';
import { useSession } from '../../src/auth/session-provider';
import { typography } from '../../src/theme/typography';

const AI_SUGGESTIONS = [
  'How am I doing today?',
  'Summarize my health this week',
  'What medications do I have today?',
];

export default function ChatScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const { user } = useSession();
  const loadConversations = useCallback(() => chatService.conversations(), []);
  const conversations = useApiQuery(queryKeys.conversations, loadConversations);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  // New chat modal state
  const [newChatOpen, setNewChatOpen] = useState(false);

  const [creatingAi, setCreatingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const creatingAiRef = useRef(false);

  const allRows = useMemo(
    () => (conversations.data ?? []).map((c) => toConversationRow(c, user?.id)),
    [conversations.data, user?.id],
  );
  const filteredRows = useMemo(
    () => searchOpen && searchText.trim()
      ? allRows.filter((row) => row.name?.toLowerCase().includes(searchText.toLowerCase()))
      : allRows,
    [allRows, searchOpen, searchText],
  );

  async function openAiConversation(initialMessage?: string) {
    if (creatingAiRef.current) return;
    await conversations.reload();
    const freshAi = conversations.data?.find((c) => c.type === 'ai');
    if (freshAi) { router.push(`/chat/${freshAi.id}` as never); return; }
    creatingAiRef.current = true;
    setCreatingAi(true);
    setAiError(null);
    try {
      const created = await chatService.createAiConversation(initialMessage);
      invalidateApiQuery(queryKeys.conversations);
      router.push(`/chat/${created.id}` as never);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : i18n('chat.aiConversationError'));
    } finally {
      creatingAiRef.current = false;
      setCreatingAi(false);
    }
  }

  function handleSuggestionPress(text: string) {
    openAiConversation(text);
  }

  const renderRow = useCallback(({ item }: { item: ReturnType<typeof toConversationRow> }) => (
    <ConversationRow
      {...item}
      onPress={() => router.push(`/chat/${item.id}` as never)}
    />
  ), []);

  const listHeader = (
    <>
      <TopBar
        title={i18n('chat.title')}
        subtitle={i18n('chat.subtitle')}
        right={
          <View style={styles.actions}>
            <IconButton
              variant="subtle"
              icon={<IconSearch size={20} color={t.ink3} />}
              accessibilityLabel={i18n('chat.searchAccessibility')}
              onPress={() => {
                setSearchOpen((v) => !v);
                if (searchOpen) setSearchText('');
              }}
            />
            <IconButton
              icon={<IconPlus size={20} color={t.brand} />}
              variant="filled"
              accessibilityLabel={i18n('chat.newChat')}
              onPress={() => setNewChatOpen(true)}
            />
          </View>
        }
      />
      {searchOpen && (
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder={i18n('chat.searchPlaceholder')}
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
        onSuggestionPress={handleSuggestionPress}
      />
      {creatingAi && <ApiState title={i18n('chat.startingAiConversation')} loading />}
      {aiError && (
        <ApiState
          title={i18n('chat.aiConversationUnavailable')}
          message={aiError}
          actionLabel={i18n('common.retry')}
          onAction={() => openAiConversation()}
        />
      )}
      <SectionHeader title={i18n('chat.conversations')} />
      {conversations.isLoading && (
        <ApiState title={i18n('chat.loadingConversations')} loading skeleton={<ChatListSkeleton />} />
      )}
      {conversations.error && (
        <ApiState
          title={i18n('chat.conversationsUnavailable')}
          message={humanizeError(conversations.error)}
          actionLabel={i18n('common.retry')}
          onAction={conversations.reload}
        />
      )}
    </>
  );

  return (
    <Screen scroll={false} padding={false}>
      <FlatList
        data={filteredRows}
        keyExtractor={(item) => item.id}
        renderItem={renderRow}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          !conversations.isLoading && !conversations.error
            ? <ApiState title={i18n('chat.noConversations')} message={i18n('chat.noConversationsMessage')} />
            : null
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

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
              title={i18n('chat.startNewConversation')}
              contract={i18n('chat.createConversationUnavailable')}
            />
            <Pressable
              onPress={() => setNewChatOpen(false)}
              style={[styles.closeBtn, { backgroundColor: t.brand, borderRadius: t.radius.pill }]}
            >
              <Text style={[typography.bodyMed, { color: '#FFF' }]}>{i18n('common.close')}</Text>
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
  listContent:  { paddingBottom: 120 },
});
