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
    <Pressable onPress={onPress} style={[styles.row, { borderColor: t.border }]}>
      {/* Icon circle */}
      <View style={[styles.iconCircle, { backgroundColor: t.brandSoft }]}>
        {icon}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[typography.micro, { color: t.ink3 }]}>
            {slotLabel} · {time}
          </Text>
          {aiScanned && (
            <View style={[styles.aiChip, { backgroundColor: t.brandSoft }]}>
              <Text style={[typography.micro, { color: t.brand }]}>AI</Text>
            </View>
          )}
        </View>
        <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>{title}</Text>
        <Text style={[typography.caption, { color: t.ink3 }]} numberOfLines={1}>{meta}</Text>
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
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content:  { flex: 1, gap: 2 },
  topRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiChip: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  kcalCol: { alignItems: 'flex-end' },
});
