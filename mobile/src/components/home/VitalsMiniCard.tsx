import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Card } from '../primitives/Card';
import { Chip } from '../primitives/Chip';
import { Sparkline } from '../charts/Sparkline';

interface VitalsMiniCardProps {
  avg: number;
  trend: number[];
  deltaBpm: number;
}

export function VitalsMiniCard({ avg, trend, deltaBpm }: VitalsMiniCardProps) {
  const t = useTheme();
  const isDown = deltaBpm < 0;

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View>
          <Text style={[typography.display, { color: t.ink }]}>{avg}</Text>
          <Text style={[typography.caption, { color: t.ink3 }]}>avg bpm · resting</Text>
        </View>
        <View style={styles.right}>
          <Sparkline data={trend} color={t.brand} width={100} height={36} />
          <Chip
            label={`${isDown ? '▼' : '▲'} ${Math.abs(deltaBpm)} bpm`}
            variant={isDown ? 'success' : 'warning'}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card:  { marginVertical: 4 },
  row:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  right: { alignItems: 'flex-end', gap: 8 },
});
