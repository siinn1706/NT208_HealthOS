import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { ProgressRing } from '../charts/ProgressRing';
import { Card } from '../primitives/Card';

interface KpiItem {
  id: string;
  label: string;
  val: string;
  tgt: string;
  v: number;
  color: string;
}

interface KpiRingGridProps {
  items: KpiItem[];
}

function KpiCell({ item }: { item: KpiItem }) {
  const t = useTheme();
  return (
    <Card tight style={styles.cell}>
      <ProgressRing value={item.v} size={44} stroke={4} color={item.color} track={t.border}>
        <Text style={[typography.micro, { color: item.color }]}>
          {Math.round(item.v * 100)}%
        </Text>
      </ProgressRing>
      <Text style={[typography.micro, { color: t.ink, marginTop: 6 }]} numberOfLines={1}>
        {item.val}
      </Text>
      <Text style={[typography.micro, { color: t.ink3 }]} numberOfLines={1}>
        {item.label}
      </Text>
    </Card>
  );
}

export function KpiRingGrid({ items }: KpiRingGridProps) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <KpiCell key={item.id} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  cell: { flex: 1, alignItems: 'center' },
});
