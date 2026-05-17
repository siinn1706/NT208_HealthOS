import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Card } from '../primitives/card';
import { PressableCard } from '../primitives/pressable-card';
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
  const { t: i18n } = useTranslation();
  const pct = Math.round(adherence * 100);
  const content = (
    <>
      <View style={styles.header}>
        <View style={[styles.iconTile, { backgroundColor: t.brandSoft, borderRadius: 12 }]}>
          <IconPill size={20} color={t.brand} />
        </View>
        <View style={styles.info}>
          <Text style={[{ fontSize: 15, fontWeight: '700', color: t.ink }]}>{name}</Text>
          <Text style={[typography.caption, { color: t.ink3, marginTop: 1 }]}>{dose}</Text>
          <View style={styles.progressRow}>
            <View style={[styles.track, { backgroundColor: t.border }]}>
              <View style={[styles.fill, { width: `${pct}%` as any, backgroundColor: t.brand }]} />
            </View>
            <Text style={[{ fontSize: 11, fontWeight: '700', color: t.brand, fontVariant: ['tabular-nums'] as any }]}>{pct}%</Text>
          </View>
        </View>
        <View style={styles.refill}>
          <Text style={[{ fontSize: 10, color: t.ink4, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' }]}>{i18n('meds.refill')}</Text>
          <Text style={[{ fontSize: 13, fontWeight: '700', color: t.ink, fontVariant: ['tabular-nums'] as any, marginTop: 2 }]}>{refillDays}d</Text>
        </View>
      </View>
    </>
  );

  const card = <Card style={styles.card}>{content}</Card>;
  return onPress ? <PressableCard onPress={onPress}>{card}</PressableCard> : card;
}

const styles = StyleSheet.create({
  card:     { marginBottom: 8 },
  header:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconTile:  { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  info:      { flex: 1 },
  refill:    { alignItems: 'flex-end', flexShrink: 0 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  track:       { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  fill:        { height: 4, borderRadius: 2 },
});
