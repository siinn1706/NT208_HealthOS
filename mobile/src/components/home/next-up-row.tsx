import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Chip, type ChipVariant } from '../primitives/chip';
import { PressableCard } from '../primitives/pressable-card';
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

export const NextUpRow = React.memo(function NextUpRow({ time, title, meta, icon, badge, onPress }: NextUpRowProps) {
  const t = useTheme();
  const IconComp = ICON_MAP[icon];

  return (
    <PressableCard onPress={onPress} style={[styles.row, { borderBottomColor: t.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: t.brandSoft, borderRadius: t.radius.sm }]}>
        {IconComp && <IconComp size={18} color={t.brand} />}
      </View>
      <View style={styles.mid}>
        <View style={styles.timeRow}>
          <Text style={[styles.timeText, { color: t.ink2 }]}>{time}</Text>
          {badge && <Chip label={badge.label} variant={badge.variant} />}
        </View>
        <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>{title}</Text>
        <Text style={[typography.caption, { color: t.ink3 }]} numberOfLines={1}>{meta}</Text>
      </View>
      <ChevronRight size={16} color={t.ink4} />
    </PressableCard>
  );
});

const styles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  iconWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  timeText: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  mid:     { flex: 1, marginRight: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
});
