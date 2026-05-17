import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography } from '../../theme/typography';
import type { ThemeTokens } from '../../theme/tokens';

export interface GoalRowData {
  icon: React.ReactNode;
  label: string;
  value: string;
  progress: number;
  met?: boolean;
}

interface GoalItemProps extends GoalRowData {
  t: ThemeTokens;
  last?: boolean;
}

export function GoalItem({ icon, label, value, progress, met, t, last }: GoalItemProps) {
  const fill = met ? t.success : t.brand;
  return (
    <View
      style={[
        styles.goalRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
      ]}
    >
      <View style={[styles.goalIcon, { backgroundColor: t.brandSoft }]}>{icon}</View>
      <View style={styles.goalMid}>
        <Text style={[typography.bodyMed, { color: t.ink }]}>{label}</Text>
        <View style={[styles.goalBar, { backgroundColor: t.border }]}>
          <View
            style={[
              styles.goalFill,
              { backgroundColor: fill, width: `${Math.min(progress * 100, 100)}%` as any },
            ]}
          />
        </View>
      </View>
      <Text
        style={[
          typography.bodyMed,
          { color: met ? t.success : t.ink, fontFamily: 'Inter_700Bold', fontSize: 14 },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  goalRow:  { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  goalIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  goalMid:  { flex: 1, gap: 6 },
  goalBar:  { height: 4, borderRadius: 2, overflow: 'hidden' },
  goalFill: { height: 4, borderRadius: 2 },
});
