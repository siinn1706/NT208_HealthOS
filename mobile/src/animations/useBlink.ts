import { useEffect } from 'react';
import { useSharedValue, withRepeat, withTiming, useAnimatedStyle, Easing } from 'react-native-reanimated';

/** Binary blink: opacity 0↔1, 1s step cycle. Used for focused input cursor indicators. */
export function useBlink(active = true) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!active) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withTiming(0, { duration: 500, easing: Easing.steps(1, false) }),
      -1,
      true,
    );
  }, [active]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}
