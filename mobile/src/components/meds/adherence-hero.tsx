import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
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

  return (
    <Card style={styles.card}>
      <ProgressRing value={percent} size={72} stroke={7} color={t.success} track={t.border}>
        <Text style={[{ fontSize: 14, fontWeight: '600', color: t.success }]}>{Math.round(percent * 100)}%</Text>
      </ProgressRing>
      <View style={styles.meta}>
        <Text style={[{ fontSize: 11, fontWeight: '700', color: t.ink3, letterSpacing: 0.5, textTransform: 'uppercase' }]}>
          30-day adherence
        </Text>
        <Text style={[{ fontSize: 22, fontWeight: '700', color: t.ink, fontVariant: ['tabular-nums'] as any, marginTop: 4 }]}>
          {taken}<Text style={{ fontSize: 14, color: t.ink3, fontWeight: '500' }}>/{total} days</Text>
        </Text>
        <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>
          On track — {missed} doses missed this month
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 20, marginVertical: 8 },
  meta: { flex: 1 },
});
