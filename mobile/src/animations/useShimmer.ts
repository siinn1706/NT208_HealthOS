import { useEffect } from 'react';
import { useSharedValue, withRepeat, withTiming, useAnimatedStyle, Easing } from 'react-native-reanimated';

/** Gradient sweep shimmer: -1 → 1 normalized position, 1200ms loop. */
export function useShimmer() {
  const position = useSharedValue(-1);

  useEffect(() => {
    position.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [position]);

  // Returns a translateX percentage — multiply by element width to get pixels
  return useAnimatedStyle(() => ({
    transform: [{ translateX: position.value * 200 }],
  }));
}
