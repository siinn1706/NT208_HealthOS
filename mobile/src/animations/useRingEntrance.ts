import { useEffect, useRef } from 'react';
import { useSharedValue, withSpring, useAnimatedProps } from 'react-native-reanimated';

const SPRING = { damping: 16, stiffness: 80 };

/**
 * Spring-entrance animation for SVG progress rings.
 * Plays once on mount; target updates animate without resetting to 0.
 */
export function useRingEntrance(target: number, circumference: number) {
  const progress = useSharedValue(0);
  const hasEntered = useRef(false);

  useEffect(() => {
    if (!hasEntered.current) {
      hasEntered.current = true;
      progress.value = withSpring(target, SPRING);
    } else {
      progress.value = withSpring(target, SPRING);
    }
  }, [target]);

  return useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));
}
