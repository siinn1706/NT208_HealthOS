import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';

interface ProgressBarProps {
  /** 0..1 for continuous mode */
  value?: number;
  /** Number of equal segments; renders filled/empty pills with gaps */
  segments?: number;
  /** Explicit filled count for segmented mode (overrides value-derived count) */
  filled?: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
  rounded?: boolean;
}

export function ProgressBar({
  value = 0,
  segments,
  filled,
  height = 6,
  trackColor,
  fillColor,
  rounded = true,
}: ProgressBarProps) {
  const t = useTheme();
  const track = trackColor ?? t.border;
  const fill = fillColor ?? t.brand;
  const radius = rounded ? height / 2 : 0;

  if (segments && segments > 0) {
    const filledCount = filled !== undefined ? filled : Math.floor(segments * value);
    return (
      <View style={[styles.row, { gap: 6 }]}>
        {Array.from({ length: segments }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              {
                height,
                borderRadius: radius,
                backgroundColor: i < filledCount ? fill : track,
              },
            ]}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.track, { height, borderRadius: radius, backgroundColor: track }]}>
      <View
        style={[
          styles.fill,
          {
            height,
            borderRadius: radius,
            backgroundColor: fill,
            width: `${Math.min(Math.max(value, 0), 1) * 100}%`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track:   { width: '100%', overflow: 'hidden' },
  fill:    {},
  row:     { flexDirection: 'row', flex: 1 },
  segment: { flex: 1 },
});
