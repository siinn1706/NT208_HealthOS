import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { ProgressRing } from '../charts/ProgressRing';
import { PressableCard } from '../primitives/PressableCard';

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
  onItemPress?: (id: string) => void;
}

function KpiCell({ item, onItemPress }: { item: KpiItem; onItemPress?: (id: string) => void }) {
  const t = useTheme();
  return (
    <PressableCard onPress={onItemPress ? () => onItemPress(item.id) : undefined} style={styles.cell}>
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
    </PressableCard>
  );
}

export function KpiRingGrid({ items, onItemPress }: KpiRingGridProps) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <KpiCell key={item.id} item={item} onItemPress={onItemPress} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  cell: { flex: 1, alignItems: 'center', padding: 12 },
});
