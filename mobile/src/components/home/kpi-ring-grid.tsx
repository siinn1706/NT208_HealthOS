import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { ProgressRing } from '../charts/progress-ring';
import { PressableCard } from '../primitives/pressable-card';
import {
  IconActivity,
  IconFootprints,
  IconWater,
  IconFire,
  IconMoon,
} from '../../icons';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  IconActivity,
  IconFootprints,
  IconWater,
  IconFire,
  IconMoon,
};

interface KpiItem {
  id: string;
  label: string;
  val: string;
  tgt: string;
  v: number;
  color: string;
  icon?: string;
}

interface KpiRingGridProps {
  items: KpiItem[];
  onItemPress?: (id: string) => void;
}

function KpiCell({ item, onItemPress }: { item: KpiItem; onItemPress?: (id: string) => void }) {
  const t = useTheme();
  const IconComp = item.icon ? ICON_MAP[item.icon] : ICON_MAP['IconActivity'];
  return (
    <PressableCard onPress={onItemPress ? () => onItemPress(item.id) : undefined} style={styles.cell}>
      <ProgressRing value={item.v} size={44} stroke={4} color={item.color} track={t.border}>
        {IconComp && <IconComp size={14} color={item.color} />}
      </ProgressRing>
      <Text style={[typography.bodyMed, { color: t.ink, marginTop: 6 }]} numberOfLines={1}>
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
  cell: { flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6 },
});
