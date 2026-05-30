import React, { useCallback, useState } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Screen } from '../layout/screen';
import { TopBar } from '../layout/top-bar';
import { IconButton } from '../primitives/icon-button';
import { Avatar } from '../primitives/avatar';
import { ApiState } from '../api/api-state';
import { IconChevronLeft, IconCheck, IconX } from '../../icons';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { chatService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import { humanizeError } from '../../api/error-message';
import { useSession } from '../../auth/session-provider';
import type { Conversation } from '../../../../shared/api-contracts';

/**
 * Pending conversation invites — group invites (require_accept) and stranger
 * DMs that need this user's acceptance. Accepting flips is_accepted=True on the
 * server so the conversation moves into the accepted list (the chat tab).
 */
export function PendingInvitesScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const { user } = useSession();
  const load = useCallback(() => chatService.pendingConversations(), []);
  const invites = useApiQuery(queryKeys.pendingConversations, load);
  const [busyId, setBusyId] = useState<string | null>(null);

  const act = useCallback(
    async (id: string, action: 'accept' | 'reject') => {
      setBusyId(id);
      try {
        if (action === 'accept') await chatService.acceptConversation(id);
        else await chatService.rejectConversation(id);
        // The accepted conversation now belongs in the main list; drop its cache
        // so the chat tab refetches and surfaces it.
        invalidateApiQuery(queryKeys.conversations);
        await invites.reload();
      } catch {
        // Keep the row; the next reload reflects the real server state.
      } finally {
        setBusyId(null);
      }
    },
    [invites],
  );

  const renderItem = useCallback(
    ({ item }: { item: Conversation }) => {
      const isGroup = item.type === 'group';
      const peer =
        item.participants.find((p) => p.id !== user?.id) ?? item.participants[0];
      const title = isGroup
        ? item.title ?? i18n('chat.pendingInvites')
        : peer?.display_name ?? i18n('chat.title');
      const subtitle = isGroup
        ? i18n('chat.groupMembers', { count: item.participants.length })
        : peer?.role ?? i18n('chat.messageRequest');
      const preview = item.last_message?.is_recalled
        ? null
        : item.last_message?.content;
      const avatarSrc = isGroup
        ? item.avatar_url ?? undefined
        : peer?.avatar_url ?? undefined;
      const busy = busyId === item.id;

      return (
        <View style={[styles.row, { borderBottomColor: t.border }]}>
          <Avatar name={title} src={avatarSrc} size={46} />
          <View style={styles.mid}>
            <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>
              {title}
            </Text>
            <Text
              style={[typography.micro, { color: t.ink3, letterSpacing: 0.6 }]}
              numberOfLines={1}
            >
              {subtitle.toUpperCase()}
            </Text>
            {preview ? (
              <Text style={[typography.caption, { color: t.ink3 }]} numberOfLines={1}>
                {preview}
              </Text>
            ) : null}
          </View>
          <View style={styles.actions}>
            <IconButton
              variant="filled"
              icon={<IconCheck size={18} color={t.brand} />}
              accessibilityLabel={i18n('chat.accept')}
              disabled={busy}
              onPress={() => act(item.id, 'accept')}
            />
            <IconButton
              variant="subtle"
              icon={<IconX size={18} color={t.ink3} />}
              accessibilityLabel={i18n('chat.reject')}
              disabled={busy}
              onPress={() => act(item.id, 'reject')}
            />
          </View>
        </View>
      );
    },
    [t, i18n, user?.id, busyId, act],
  );

  return (
    <Screen scroll={false} padding={false}>
      <TopBar
        title={i18n('chat.pendingInvites')}
        subtitle={i18n('chat.pendingInvitesSubtitle')}
        left={
          <IconButton
            variant="ghost"
            icon={<IconChevronLeft size={22} color={t.ink} />}
            accessibilityLabel={i18n('common.back')}
            onPress={() => router.back()}
          />
        }
      />
      {invites.isLoading && <ApiState title={i18n('chat.loadingInvites')} loading />}
      {invites.error && (
        <ApiState
          title={i18n('chat.invitesUnavailable')}
          message={humanizeError(invites.error)}
          actionLabel={i18n('common.retry')}
          onAction={invites.reload}
        />
      )}
      <FlatList
        data={invites.data ?? []}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        ListEmptyComponent={
          !invites.isLoading && !invites.error ? (
            <ApiState
              title={i18n('chat.noPendingInvites')}
              message={i18n('chat.noPendingInvitesMessage')}
            />
          ) : null
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  mid: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  listContent: { paddingBottom: 120 },
});
