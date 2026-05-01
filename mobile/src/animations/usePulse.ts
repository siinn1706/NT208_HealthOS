import { useEffect } from 'react';
import { useSharedValue, withRepeat, withTiming, useAnimatedStyle, Easing } from 'react-native-reanimated';

interface PulseOptions {
  minOpacity?: number;
  maxOpacity?: number;
  minScale?: number;
  maxScale?: number;
  /** Duration for one half of the cycle in ms */
  halfDuration?: number;
}

/** Breathing pulse: opacity + scale cycle, 2s loop. Used for status dots and AI insight indicators. */
export function usePulse({
  minOpacity = 0.3,
  maxOpacity = 1,
  minScale = 1,
  maxScale = 1.15,
  halfDuration = 1000,
}: PulseOptions = {}) {
  const opacity = useSharedValue(maxOpacity);
  const scale = useSharedValue(minScale);

  useEffect(() => {
    const cfg = { duration: halfDuration, easing: Easing.inOut(Easing.ease) };
    opacity.value = withRepeat(withTiming(minOpacity, cfg), -1, true);
    scale.value = withRepeat(withTiming(maxScale, cfg), -1, true);
  }, []);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
}
