import { useSharedValue, withSpring, withTiming, useAnimatedStyle } from 'react-native-reanimated';

const ease = { duration: 100 };
const spring = { damping: 18, stiffness: 220 };

export function usePressScale() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  function onPressIn() {
    scale.value = withTiming(0.97, ease);
    opacity.value = withTiming(0.92, ease);
  }

  function onPressOut() {
    scale.value = withSpring(1, spring);
    opacity.value = withTiming(1, { duration: 150 });
  }

  return { animatedStyle, onPressIn, onPressOut };
}
