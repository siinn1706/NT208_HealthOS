import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Card } from '../primitives/Card';
import { PressableCard } from '../primitives/PressableCard';

interface MedCardProps {
  name: string;
  dose: string;
  adherence: number;
  refillDays: number;
  color: string;
  onPress?: () => void;
}

export function MedCard({ name, dose, adherence, refillDays, color, onPress }: MedCardProps) {
  const t = useTheme();
  const pct = Math.round(adherence * 100);
  const content = (
    <>
      <View style={styles.header}>
        <View style={[styles.indicator, { backgroundColor: color }]} />
        <View style={styles.info}>
          <Text style={[typography.bodyMed, { color: t.ink }]}>{name}</Text>
          <Text style={[typography.caption, { color: t.ink3 }]}>{dose}</Text>
        </View>
        <Text style={[typography.h3, { color }]}>{pct}%</Text>
      </View>
      {/* adherence bar */}
      <View style={[styles.track, { backgroundColor: t.border }]}>
        <View style={[styles.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[typography.micro, { color: t.ink4, marginTop: 6 }]}>
        Refill in {refillDays} days
      </Text>
    </>
  );

  const card = <Card style={styles.card}>{content}</Card>;
  return onPress ? <PressableCard onPress={onPress}>{card}</PressableCard> : card;
}

const styles = StyleSheet.create({
  card:      { marginBottom: 8 },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  indicator: { width: 4, height: 36, borderRadius: 2 },
  info:      { flex: 1 },
  track:     { height: 4, borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  fill:      { height: 4, borderRadius: 2 },
});
