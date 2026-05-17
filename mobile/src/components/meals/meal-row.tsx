import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';

interface MealRowProps {
  slotLabel: string;
  time: string;
  title: string;
  meta: string;
  kcal: number;
  icon: React.ReactNode;
  aiScanned?: boolean;
  onPress?: () => void;
}

export function MealRow({ slotLabel, time, title, meta, kcal, icon, aiScanned, onPress }: MealRowProps) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.row, { backgroundColor: t.card, borderColor: t.border }]}>
      {/* Icon tile — square with rounded corners */}
      <View style={[styles.iconTile, { borderRadius: t.radius.md, overflow: 'hidden' }]}>
        {icon}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[typography.micro, { color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.4 }]}>
            {slotLabel} · {time}
          </Text>
          {aiScanned && (
            <View style={[styles.aiChip, { backgroundColor: t.brandSoft, borderRadius: t.radius.pill }]}>
              <Text style={[typography.micro, { color: t.brand }]}>AI</Text>
            </View>
          )}
        </View>
        <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>{title}</Text>
        <Text style={[typography.caption, { color: t.brand }]} numberOfLines={1}>{meta}</Text>
      </View>

      {/* Calories */}
      <View style={styles.kcalCol}>
        <Text style={[typography.h3, { color: t.ink }]}>{kcal}</Text>
        <Text style={[typography.micro, { color: t.ink3 }]}>kcal</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 12,
  },
  iconTile: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content:  { flex: 1, gap: 2 },
  topRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiChip: {
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  kcalCol: { alignItems: 'flex-end' },
});
