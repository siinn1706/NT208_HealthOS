import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '../../../theme/useTheme';
import { usePulse } from '../../../animations/usePulse';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 16, radius, style }: SkeletonProps) {
  const t = useTheme();
  const pulseStyle = usePulse({ minOpacity: 0.35, maxOpacity: 1, minScale: 1, maxScale: 1, halfDuration: 800 });

  return (
    <Animated.View
      style={[
        pulseStyle,
        {
          width,
          height,
          borderRadius: radius ?? t.radius.sm,
          backgroundColor: t.border,
        },
        style,
      ]}
    />
  );
}

interface SkeletonGroupProps {
  rows?: number;
  style?: StyleProp<ViewStyle>;
}

/** Convenience: stacked row skeletons for list placeholders */
export function SkeletonGroup({ rows = 3, style }: SkeletonGroupProps) {
  return (
    <View style={[styles.group, style]}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={14} width={i === rows - 1 ? '60%' : '100%'} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
});
