import { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';

/** Single-shot ripple: scale 0→2.5, opacity 0.25→0, 400ms. Call trigger() on press with touch coordinates. */
export function useRipple() {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  function trigger() {
    scale.value = 0;
    opacity.value = 0.25;
    scale.value = withTiming(2.5, { duration: 400 });
    opacity.value = withTiming(0, { duration: 400 });
  }

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return { trigger, style };
}
