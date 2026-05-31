import React, { useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { toBubble } from '../../api/viewModels';
import { ApiState } from '../api/api-state';
import { Bubble } from './bubble';
import { DateChip } from './date-chip';
import type { Message } from '../../../../shared/api-contracts';

interface ChatMessageListProps {
  messages: Message[];
  currentUserId?: string | null;
  loading: boolean;
  error: Error | null;
  sending: boolean;
  sendError: string | null;
  hasMore: boolean;
  loadingOlder: boolean;
  olderError: string | null;
  onRetry: () => void;
  onDismissSendError: () => void;
  onLoadOlder: () => void;
}

export function ChatMessageList({
  messages,
  currentUserId,
  loading,
  error,
  sending,
  sendError,
  hasMore,
  loadingOlder,
  olderError,
  onRetry,
  onDismissSendError,
  onLoadOlder,
}: ChatMessageListProps) {
  const t = useTheme();
  const reversed = useMemo(() => [...messages].reverse(), [messages]);
  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => (
      <Bubble {...toBubble(item, currentUserId)} index={messages.length - 1 - index} />
    ),
    [currentUserId, messages.length],
  );

  return (
    <>
      {loading && <ApiState title="Loading messages" loading />}
      {error && (
        <ApiState
          title="Messages unavailable"
          message={error.message}
          actionLabel="Retry"
          onAction={onRetry}
        />
      )}
      {!loading && !error && messages.length === 0 && !sending && (
        <ApiState title="No messages yet" message="Start the conversation below." />
      )}
      {sendError && (
        <ApiState
          title="Send failed"
          message={sendError}
          actionLabel="Dismiss"
          onAction={onDismissSendError}
        />
      )}
      <FlatList
        data={reversed}
        inverted
        keyExtractor={(message) => message.id}
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
                onPress={onLoadOlder}
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
    </>
  );
}

const styles = StyleSheet.create({
  messages:      { paddingHorizontal: 16, paddingBottom: 16 },
  historyFooter: { alignItems: 'center', marginTop: 8, gap: 6 },
  loadOlderBtn:  { paddingHorizontal: 12, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth, borderRadius: 999 },
});
