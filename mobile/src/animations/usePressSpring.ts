import { useSharedValue, withTiming, withSpring, useAnimatedStyle } from 'react-native-reanimated';

interface PressSpringOptions {
  pressScale?: number;
  pressOpacity?: number;
}

/** Press-in: scale+opacity withTiming. Press-out: spring back. Used by PressableCard and BottomTabBar. */
export function usePressSpring({ pressScale = 0.97, pressOpacity = 0.92 }: PressSpringOptions = {}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  function onPressIn() {
    scale.value = withTiming(pressScale, { duration: 100 });
    opacity.value = withTiming(pressOpacity, { duration: 100 });
  }

  function onPressOut() {
    scale.value = withSpring(1, { damping: 18, stiffness: 220 });
    opacity.value = withTiming(1, { duration: 150 });
  }

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return { onPressIn, onPressOut, style };
}

/** Simplified: bounce-tap spring. For tab bar icons. */
export function useTabBounce() {
  const scale = useSharedValue(1);

  function trigger() {
    scale.value = withSpring(1.08, { damping: 10, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 14, stiffness: 260 });
    });
  }

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { trigger, style };
}
