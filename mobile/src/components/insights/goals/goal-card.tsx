// GoalCard — reusable card for individual health goals
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';

export interface GoalCardProps {
  title: string;
  sub: string;         // e.g. "7,842 / 10,000"
  icon: React.ReactNode;
  progress: number;    // 0–1
  streak: number;      // days
  done?: boolean;
  color: string;       // hex or theme color value
  onPress: () => void;
}

export function GoalCard({ title, sub, icon, progress, streak, done, color, onPress }: GoalCardProps) {
  const t = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg }]}
    >
      {/* Top row: icon circle + title + streak pill */}
      <View style={styles.topRow}>
        <View style={[styles.iconCircle, { backgroundColor: color + '20', borderRadius: t.radius.md }]}>
          {icon}
        </View>
        <View style={styles.titleBlock}>
          <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>{title}</Text>
          <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]} numberOfLines={1}>{sub}</Text>
        </View>
        <View style={styles.badgeRow}>
          {streak > 0 && (
            <View style={[styles.streakPill, { backgroundColor: t.warning + '22', borderRadius: t.radius.pill }]}>
              <Text style={[typography.micro, { color: t.warning }]}>🔥 {streak}d</Text>
            </View>
          )}
          {done && (
            <View style={[styles.donePill, { backgroundColor: t.success + '22', borderRadius: t.radius.pill, marginLeft: 4 }]}>
              <Text style={[typography.micro, { color: t.success }]}>Done</Text>
            </View>
          )}
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.barTrack, { backgroundColor: t.border, borderRadius: t.radius.pill, marginTop: 10 }]}>
        <View
          style={[
            styles.barFill,
            { backgroundColor: done ? t.success : color, borderRadius: t.radius.pill, width: `${Math.min(100, Math.round(progress * 100))}%` },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card:       { padding: 14, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth },
  topRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconCircle: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { flex: 1 },
  badgeRow:   { flexDirection: 'row', alignItems: 'center' },
  streakPill: { paddingHorizontal: 7, paddingVertical: 3 },
  donePill:   { paddingHorizontal: 7, paddingVertical: 3 },
  barTrack:   { height: 6 },
  barFill:    { height: 6 },
});
