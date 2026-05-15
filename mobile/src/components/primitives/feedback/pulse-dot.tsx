import React from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '../../../theme/useTheme';
import { usePulse } from '../../../animations/usePulse';

interface PulseDotProps {
  color?: string;
  size?: number;
}

/** Animated status indicator dot — breathing pulse. Used for in-progress, recording, online states. */
export function PulseDot({ color, size = 8 }: PulseDotProps) {
  const t = useTheme();
  const pulseStyle = usePulse({ minOpacity: 0.4, maxOpacity: 1, minScale: 0.85, maxScale: 1.15 });

  return (
    <Animated.View
      style={[
        styles.dot,
        pulseStyle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color ?? t.success,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {},
});
