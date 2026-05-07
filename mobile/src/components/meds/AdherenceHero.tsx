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
      <ProgressRing value={percent} size={72} stroke={8} color={t.success} track={t.border}>
        <Text style={[typography.h3, { color: t.success }]}>{Math.round(percent * 100)}%</Text>
      </ProgressRing>
      <View style={styles.meta}>
        <Text style={[typography.micro, { color: t.ink3, letterSpacing: 0.6, textTransform: 'uppercase' }]}>
          30-Day Adherence
        </Text>
        <Text style={[typography.title, { color: t.ink }]}>
          {taken}<Text style={{ color: t.ink3, fontWeight: '500' }}>/{total} days</Text>
        </Text>
        <Text style={[typography.caption, { color: t.ink3 }]}>
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
