import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, TextInput, View, StyleSheet } from 'react-native';
import { Screen } from '../../src/components/layout/screen';
import { TopBar } from '../../src/components/layout/top-bar';
import { SectionHeader } from '../../src/components/layout/section-header';
import { IconButton } from '../../src/components/primitives/icon-button';
import { ApiState } from '../../src/components/api/api-state';
import { ChatListSkeleton } from '../../src/components/api/skeletons';
import { AiAssistantHero } from '../../src/components/chat/ai-assistant-hero';
import { ConversationRow } from '../../src/components/chat/conversation-row';
import { NewChatModal } from '../../src/components/chat/new-chat-modal';
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
import type { Conversation } from '../../../shared/api-contracts';

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

  const handleConversationCreated = useCallback((conversation: Conversation) => {
    invalidateApiQuery(queryKeys.conversations);
    setNewChatOpen(false);
    router.push(`/chat/${conversation.id}` as never);
  }, []);

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

      <NewChatModal
        visible={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onCreated={handleConversationCreated}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions:      { flexDirection: 'row', gap: 4 },
  searchInput:  { marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, fontSize: 14 },
  listContent:  { paddingBottom: 120 },
});
