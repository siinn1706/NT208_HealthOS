import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography } from '../../theme/typography';
import type { ThemeTokens } from '../../theme/tokens';

interface DeltaItemProps {
  icon: React.ReactNode;
  label: string;
  delta: string;
  value: string;
  positive?: boolean;
  t: ThemeTokens;
  last?: boolean;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function DeltaItem({ icon, label, delta, value, positive, t, last }: DeltaItemProps) {
  const color = positive ? t.success : t.danger;
  const iconBg = hexToRgba(color, 0.10);
  return (
    <View
      style={[
        styles.deltaRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
      ]}
    >
      <View style={[styles.deltaIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.deltaMid}>
        <Text style={[typography.bodyMed, { color: t.ink }]}>{label}</Text>
        <Text style={[typography.caption, { color }]}>{delta}</Text>
      </View>
      <Text
        style={[typography.bodyMed, { color: t.ink, fontFamily: 'Inter_700Bold', fontSize: 14 }]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  deltaRow:  { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  deltaIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  deltaMid:  { flex: 1 },
});
