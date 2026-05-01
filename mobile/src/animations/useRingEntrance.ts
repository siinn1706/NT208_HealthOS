import { useCallback } from 'react';
import { useSharedValue, withSpring, useAnimatedProps } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';

const SPRING = { damping: 16, stiffness: 80 };

/**
 * Spring-entrance animation for SVG progress rings.
 * Returns animatedProps suitable for react-native-svg's AnimatedCircle.
 */
export function useRingEntrance(target: number, circumference: number) {
  const progress = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      progress.value = 0;
      progress.value = withSpring(target, SPRING);
    }, [target]),
  );

  return useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));
}
