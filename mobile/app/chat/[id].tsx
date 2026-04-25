import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../src/theme/useTheme';
import { typography } from '../../src/theme/typography';
import { Bubble } from '../../src/components/chat/Bubble';
import { DateChip } from '../../src/components/chat/DateChip';
import { Composer } from '../../src/components/chat/Composer';
import { Avatar } from '../../src/components/primitives/Avatar';
import { IconButton } from '../../src/components/primitives/IconButton';
import { ChevronLeft, IconMore, IconRobot } from '../../src/icons';
import { aiThread } from '../../src/mocks/chat';

export default function AiConversationScreen() {
  const t = useTheme();
  const [messages, setMessages] = useState(aiThread);
  const [typing, setTyping] = useState(false);

  function handleSend(text: string) {
    const next = [...messages, { id: String(Date.now()), side: 'me' as const, text, time: 'Now' }];
    setMessages(next);
    setTyping(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now() + 1), side: 'ai' as const, text: 'Thanks for sharing. Let me look into that for you.', time: 'Now' },
      ]);
      setTyping(false);
    }, 2000);
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
        <View style={[styles.avatarWrap, { backgroundColor: t.brand, borderRadius: t.radius.md }]}>
          <IconRobot size={20} color="#FFF" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[typography.bodyMed, { color: t.ink }]}>HealthOS AI</Text>
          <Text style={[typography.micro, { color: t.ink3 }]}>Always private · Never medical advice</Text>
        </View>
        <IconButton icon={<IconMore size={20} color={t.ink3} />} accessibilityLabel="More" />
      </View>

      {/* Messages */}
      <ScrollView
        contentContainerStyle={styles.messages}
        showsVerticalScrollIndicator={false}
      >
        <DateChip label="Today" />
        {messages.map((m, i) => (
          <Bubble key={m.id} {...m} index={i} />
        ))}
        {typing && <Bubble side="ai" isTyping />}
      </ScrollView>

      <Composer onSend={handleSend} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  avatarWrap:{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerInfo:{ flex: 1 },
  messages:  { paddingHorizontal: 16, paddingBottom: 16 },
});
