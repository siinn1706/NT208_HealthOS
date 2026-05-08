import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconPlus } from '../../icons';

interface FoodRowProps {
  name: string;
  serving: string;
  kcal: number;
  /** Optional icon square shown on the left. */
  icon?: React.ReactNode;
  /** Optional frequency/badge label shown next to the name. */
  frequencyLabel?: string;
  /** Optional subtitle beneath serving text. */
  subtitle?: string;
  /** Whether to show the + add button (default true). */
  showAddButton?: boolean;
  onPress?: () => void;
}

export function FoodRow({ name, serving, kcal, icon, frequencyLabel, subtitle, showAddButton = true, onPress }: FoodRowProps) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.row, { borderBottomColor: t.border }]}>
      {icon && (
        <View style={[styles.iconSquare, { backgroundColor: t.brandSoft, borderRadius: t.radius.md }]}>
          {icon}
        </View>
      )}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>{name}</Text>
          {frequencyLabel && (
            <View style={[styles.freqChip, { backgroundColor: t.chip, borderRadius: t.radius.pill }]}>
              <Text style={[typography.micro, { color: t.brand }]}>{frequencyLabel}</Text>
            </View>
          )}
        </View>
        <Text style={[typography.caption, { color: t.ink3 }]}>{serving}</Text>
        {subtitle && (
          <Text style={[typography.micro, { color: t.ink4, marginTop: 1 }]}>{subtitle}</Text>
        )}
      </View>
      <Text style={[typography.bodyMed, { color: t.ink2 }]}>{kcal} kcal</Text>
      {showAddButton && (
        <View style={[styles.addBtn, { backgroundColor: t.brandSoft, borderRadius: t.radius.pill }]}>
          <IconPlus size={14} color={t.brand} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  iconSquare: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  info:       { flex: 1, gap: 1 },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  freqChip:   { paddingHorizontal: 6, paddingVertical: 2 },
  addBtn:     { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
});
