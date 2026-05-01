import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Avatar } from '../primitives/Avatar';
import { PressableCard } from '../primitives/PressableCard';

interface ConversationRowProps {
  name: string;
  role: string;
  last: string;
  time: string;
  unread: number;
  online: boolean;
  onPress?: () => void;
}

export function ConversationRow({ name, role, last, time, unread, online, onPress }: ConversationRowProps) {
  const t = useTheme();

  return (
    <PressableCard onPress={onPress} style={[styles.row, { borderBottomColor: t.border }]}>
      <View style={styles.avatarWrap}>
        <Avatar name={name} size={44} />
        {online && <View style={[styles.onlineDot, { backgroundColor: t.success, borderColor: t.bg }]} />}
      </View>
      <View style={styles.mid}>
        <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>{name}</Text>
        <Text style={[typography.caption, { color: t.ink3 }]} numberOfLines={1}>{last}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[typography.micro, { color: t.ink4 }]}>{time}</Text>
        {unread > 0 && (
          <View style={[styles.badge, { backgroundColor: t.danger }]}>
            <Text style={styles.badgeText}>{unread}</Text>
          </View>
        )}
      </View>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  avatarWrap: { position: 'relative' },
  onlineDot:  { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  mid:        { flex: 1 },
  right:      { alignItems: 'flex-end', gap: 6 },
  badge:      { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText:  { color: '#FFF', fontSize: 10, fontWeight: '700' },
});
