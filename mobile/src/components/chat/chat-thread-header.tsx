import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { ChevronLeft, IconChat, IconMore, IconRobot } from '../../icons';
import { IconButton } from '../primitives/icon-button';
import type { ConversationDisplay } from '../../chat/conversation-display';
import type { ChatWsState } from '../../hooks/use-chat-websocket';

interface ChatThreadHeaderProps {
  display: ConversationDisplay;
  realtimeState: ChatWsState;
  onBack: () => void;
  onMore: () => void;
}

function connectionLabel(state: ChatWsState) {
  if (state === 'connected') return 'Live updates';
  if (state === 'connecting') return 'Connecting';
  return 'REST fallback';
}

export function ChatThreadHeader({
  display,
  realtimeState,
  onBack,
  onMore,
}: ChatThreadHeaderProps) {
  const t = useTheme();
  const AvatarIcon = display.isAi ? IconRobot : IconChat;

  return (
    <View style={[styles.header, { borderBottomColor: t.border, backgroundColor: t.card }]}>
      <IconButton
        icon={<ChevronLeft size={22} color={t.ink} />}
        onPress={onBack}
        accessibilityLabel="Back"
        variant="subtle"
        size={44}
      />
      <View style={[styles.avatarWrap, { backgroundColor: t.brandSoft, borderRadius: t.radius.md }]}>
        <AvatarIcon size={20} color={t.brand} />
      </View>
      <View style={styles.headerInfo}>
        <View style={styles.titleRow}>
          <Text
            numberOfLines={1}
            style={[typography.h3, styles.title, { color: t.ink }]}
          >
            {display.title}
          </Text>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: realtimeState === 'connected' && display.isOnline ? t.success : t.warning },
            ]}
          />
        </View>
        <Text numberOfLines={1} style={[typography.micro, { color: t.ink3 }]}>
          {connectionLabel(realtimeState)} - {display.subtitle}
        </Text>
      </View>
      <IconButton
        icon={<IconMore size={20} color={t.ink3} />}
        accessibilityLabel="More"
        onPress={onMore}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  avatarWrap: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1, minWidth: 0 },
  titleRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title:      { flex: 1, fontSize: 16, fontWeight: '700' },
  statusDot:  { width: 6, height: 6, borderRadius: 3 },
});
