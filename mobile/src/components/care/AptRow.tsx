import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Chip, type ChipVariant } from '../primitives/Chip';
import { PressableCard } from '../primitives/PressableCard';

interface AptRowProps {
  dayLabel: string;
  date: number;
  time: string;
  doctor: string;
  specialty: string;
  location: string;
  type: string;
  badge: { label: string; variant: ChipVariant };
  onPress?: () => void;
}

export function AptRow({ dayLabel, date, time, doctor, specialty, location, type, badge, onPress }: AptRowProps) {
  const t = useTheme();

  return (
    <PressableCard onPress={onPress} style={[styles.row, { borderColor: t.border, borderRadius: t.radius.lg }]}>
      <View style={[styles.dateBlock, { backgroundColor: t.brandSoft, borderRadius: t.radius.md }]}>
        <Text style={[typography.micro, { color: t.brand }]}>{dayLabel}</Text>
        <Text style={[typography.h3,    { color: t.brand }]}>{date}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>{doctor}</Text>
        <Text style={[typography.caption, { color: t.ink3 }]} numberOfLines={1}>{specialty} · {time}</Text>
        <Text style={[typography.caption, { color: t.ink4 }]} numberOfLines={1}>{location}</Text>
      </View>
      <Chip label={badge.label} variant={badge.variant} />
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 8 },
  dateBlock: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  meta:      { flex: 1 },
});
