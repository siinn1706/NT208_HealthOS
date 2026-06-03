import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography, tabularNums } from '../../theme/typography';
import { Card } from '../primitives/card';
import { ProgressRing } from '../charts/progress-ring';

interface AdherenceHeroProps {
  percent: number;
  taken: number;
  total: number;
  missed: number;
}

export function AdherenceHero({ percent, taken, total, missed }: AdherenceHeroProps) {
  const t = useTheme();
  const { t: i18n } = useTranslation();

  return (
    <Card style={styles.card}>
      <ProgressRing value={percent} size={72} stroke={7} color={t.success} track={t.border}>
        <Text style={[typography.bodyMed, { color: t.success }]}>{Math.round(percent * 100)}%</Text>
      </ProgressRing>
      <View style={styles.meta}>
        <Text style={[typography.micro, { color: t.ink3, textTransform: 'uppercase' }]}>
          {i18n('meds.thirtyDayAdherence')}
        </Text>
        <Text style={[typography.title, tabularNums, { color: t.ink, marginTop: 4 }]}>
          {taken}<Text style={[typography.bodyMed, { color: t.ink3 }]}>/{total} {i18n('meds.days')}</Text>
        </Text>
        <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>
          {i18n('meds.onTrackMissed', { count: missed })}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 20, marginVertical: 8 },
  meta: { flex: 1 },
});
