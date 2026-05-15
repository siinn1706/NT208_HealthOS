import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Card } from '../primitives/card';
import { PressableCard } from '../primitives/pressable-card';
import { Chip } from '../primitives/chip';
import { Sparkline } from '../charts/sparkline';

interface VitalsMiniCardProps {
  avg: number;
  trend: number[];
  deltaBpm: number;
  onPress?: () => void;
}

export function VitalsMiniCard({ avg, trend, deltaBpm, onPress }: VitalsMiniCardProps) {
  const t = useTheme();
  const isDown = deltaBpm < 0;

  const inner = (
    <View style={styles.row}>
      <View>
        <Text style={[typography.caption, { color: t.ink3, fontWeight: '600' }]}>Heart rate · 7 days</Text>
        <Text style={[styles.avgText, { color: t.ink }]}>
          {avg}<Text style={[typography.caption, { color: t.ink3 }]}> bpm avg</Text>
        </Text>
      </View>
      <View style={styles.right}>
        <Sparkline data={trend} color={t.brand} width={100} height={36} />
        <Chip
          label={`${isDown ? '▼' : '▲'} ${Math.abs(deltaBpm)} bpm`}
          variant={isDown ? 'success' : 'warning'}
        />
      </View>
    </View>
  );

  if (onPress) {
    return <PressableCard onPress={onPress} style={styles.card}>{inner}</PressableCard>;
  }
  return <Card style={styles.card}>{inner}</Card>;
}

const styles = StyleSheet.create({
  card:    { marginVertical: 4 },
  row:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  right:   { alignItems: 'flex-end', gap: 8 },
  avgText: { fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'], marginTop: 2 },
});
