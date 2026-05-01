import { useSharedValue, withSpring, useAnimatedProps } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

const springConfig = { damping: 16, stiffness: 80 };

export function useAnimatedRing(target: number, circumference: number) {
  const progress = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      progress.value = 0;
      progress.value = withSpring(target, springConfig);
    }, [target])
  );

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return animatedProps;
}
