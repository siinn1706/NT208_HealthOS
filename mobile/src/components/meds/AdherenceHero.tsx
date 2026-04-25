import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Card } from '../primitives/Card';
import { ProgressRing } from '../charts/ProgressRing';

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
      <ProgressRing value={percent} size={100} stroke={8} color={t.success} track={t.border}>
        <Text style={[typography.h3, { color: t.success }]}>{Math.round(percent * 100)}%</Text>
      </ProgressRing>
      <View style={styles.meta}>
        <Text style={[typography.title, { color: t.ink }]}>{taken}/{total} days</Text>
        <Text style={[typography.caption, { color: t.ink3 }]}>
          {missed} missed · {total - taken - missed} upcoming
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 20, marginVertical: 8 },
  meta: { flex: 1 },
});
