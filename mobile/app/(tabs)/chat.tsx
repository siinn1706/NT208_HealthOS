import React from 'react';
import { Screen } from '../../src/components/layout/Screen';
import { TopBar } from '../../src/components/layout/TopBar';
import { SectionHeader } from '../../src/components/layout/SectionHeader';
import { IconButton } from '../../src/components/primitives/IconButton';
import { AiAssistantHero } from '../../src/components/chat/AiAssistantHero';
import { ConversationRow } from '../../src/components/chat/ConversationRow';
import { IconSearch, IconPlus } from '../../src/icons';
import { conversations, aiSuggestions } from '../../src/mocks/chat';
import { useTheme } from '../../src/theme/useTheme';
import { router } from 'expo-router';
import { View, StyleSheet } from 'react-native';

export default function ChatScreen() {
  const t = useTheme();

  return (
    <Screen>
      <TopBar
        title="Chat"
        subtitle="Care team & AI assistant"
        right={
          <View style={styles.actions}>
            <IconButton icon={<IconSearch size={20} color={t.ink3} />} accessibilityLabel="Search" />
            <IconButton icon={<IconPlus size={20} color={t.brand} />} variant="filled" accessibilityLabel="New chat" />
          </View>
        }
      />

      <AiAssistantHero
        suggestions={aiSuggestions}
        onPress={() => router.push('/chat/ai')}
        onSuggestion={() => router.push('/chat/ai')}
      />

      <SectionHeader title="Conversations" />
      {conversations.map((c) => (
        <ConversationRow
          key={c.id}
          {...c}
          onPress={() => router.push('/chat/ai')}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 4 },
});
