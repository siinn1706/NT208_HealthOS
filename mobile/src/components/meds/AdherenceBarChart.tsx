import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';

interface AdherenceBarChartProps {
  /** Array of adherence values in [0,1] per bar. Length ≤ 30. */
  values: number[];
  height?: number;
}

export function AdherenceBarChart({ values, height = 30 }: AdherenceBarChartProps) {
  const t = useTheme();
  // Pad / clamp to 30 bars
  const bars = [...values].slice(0, 30);
  while (bars.length < 30) bars.unshift(-1); // -1 = no data (renders as track color)

  return (
    <View style={[s.row, { height }]}>
      {bars.map((v, i) => {
        const noData = v < 0;
        const fillPct = noData ? 0 : Math.max(0, Math.min(1, v));
        return (
          <View key={i} style={[s.bar, { backgroundColor: t.borderStrong, borderRadius: 1 }]}>
            {!noData && fillPct > 0 && (
              <View
                style={[
                  s.fill,
                  {
                    height: `${Math.round(fillPct * 100)}%` as any,
                    backgroundColor: fillPct >= 0.7 ? t.success : fillPct >= 0.4 ? t.warning : t.danger,
                    borderRadius: 1,
                  },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'flex-end', gap: 1 },
  bar:  { flex: 1, height: '100%', overflow: 'hidden', justifyContent: 'flex-end' },
  fill: { width: '100%' },
});
