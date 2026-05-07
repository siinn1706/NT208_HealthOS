import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Card } from '../primitives/Card';
import { PressableCard } from '../primitives/PressableCard';
import { IconPill } from '../../icons';

interface MedCardProps {
  name: string;
  dose: string;
  adherence: number;
  refillDays: number;
  color?: string;
  onPress?: () => void;
}

export function MedCard({ name, dose, adherence, refillDays, onPress }: MedCardProps) {
  const t = useTheme();
  const pct = Math.round(adherence * 100);
  const content = (
    <>
      <View style={styles.header}>
        <View style={[styles.iconTile, { backgroundColor: t.brandSoft, borderRadius: t.radius.md }]}>
          <IconPill size={20} color={t.brand} />
        </View>
        <View style={styles.info}>
          <Text style={[typography.bodyMed, { color: t.ink, fontSize: 16, fontWeight: '700' }]}>{name}</Text>
          <Text style={[typography.caption, { color: t.ink3 }]}>{dose}</Text>
        </View>
        <View style={styles.refill}>
          <Text style={[typography.micro, { color: t.ink3, letterSpacing: 0.6, textTransform: 'uppercase' }]}>Refill</Text>
          <Text style={[typography.bodyMed, { color: t.brand }]}>{refillDays} days</Text>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: t.border }]}>
        <View style={[styles.fill, { width: `${pct}%` as any, backgroundColor: t.brand }]} />
      </View>
    </>
  );

  const card = <Card style={styles.card}>{content}</Card>;
  return onPress ? <PressableCard onPress={onPress}>{card}</PressableCard> : card;
}

const styles = StyleSheet.create({
  card:     { marginBottom: 8 },
  header:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconTile: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  info:     { flex: 1 },
  refill:   { alignItems: 'flex-end' },
  track:    { height: 4, borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  fill:     { height: 4, borderRadius: 2 },
});
