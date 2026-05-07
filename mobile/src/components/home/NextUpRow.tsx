import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Chip, type ChipVariant } from '../primitives/Chip';
import { PressableCard } from '../primitives/PressableCard';
import { IconPill, IconVideo, IconCoffee, ChevronRight } from '../../icons';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  IconPill:   IconPill,
  IconVideo:  IconVideo,
  IconCoffee: IconCoffee,
};

interface NextUpRowProps {
  time: string;
  title: string;
  meta: string;
  icon: string;
  badge: { label: string; variant: ChipVariant } | null;
  onPress?: () => void;
}

export function NextUpRow({ time, title, meta, icon, badge, onPress }: NextUpRowProps) {
  const t = useTheme();
  const IconComp = ICON_MAP[icon];

  return (
    <PressableCard onPress={onPress} style={[styles.row, { borderBottomColor: t.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: t.brandSoft, borderRadius: t.radius.md }]}>
        {IconComp && <IconComp size={18} color={t.brand} />}
      </View>
      <View style={styles.mid}>
        <View style={styles.timeRow}>
          <Text style={[typography.bodyMed, { color: t.ink }]}>{time}</Text>
          {badge && <Chip label={badge.label} variant={badge.variant} />}
        </View>
        <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>{title}</Text>
        <Text style={[typography.caption, { color: t.ink3 }]} numberOfLines={1}>{meta}</Text>
      </View>
      <ChevronRight size={16} color={t.ink4} />
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  iconWrap:{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  mid:     { flex: 1, marginRight: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
});
