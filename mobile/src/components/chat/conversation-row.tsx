import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Avatar } from '../primitives/avatar';
import { PressableCard } from '../primitives/pressable-card';

interface ConversationRowProps {
  name: string;
  role: string;
  last: string;
  time: string;
  unread: number;
  online: boolean;
  onPress?: () => void;
}

export const ConversationRow = React.memo(function ConversationRow({ name, role, last, time, unread, onPress }: Omit<ConversationRowProps, 'online'> & { online?: boolean }) {
  const t = useTheme();

  return (
    <PressableCard onPress={onPress} style={[styles.row, { borderBottomColor: t.border }]}>
      <Avatar name={name} size={46} />
      <View style={styles.mid}>
        <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>{name}</Text>
        {role ? (
          <Text style={[typography.micro, { color: t.ink3, letterSpacing: 0.6 }]} numberOfLines={1}>
            {role.toUpperCase()}
          </Text>
        ) : null}
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
});

const styles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  mid:      { flex: 1 },
  right:    { alignItems: 'flex-end', gap: 6 },
  badge:    { minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText:{ color: '#FFF', fontSize: 10, fontWeight: '700' },
});
