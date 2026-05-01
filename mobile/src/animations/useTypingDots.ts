import { useEffect } from 'react';
import {
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';

/** Staggered 3-dot typing animation: 1.2s cycle. Returns animated styles for each dot. */
export function useTypingDots() {
  const a = useSharedValue(0.25);
  const b = useSharedValue(0.25);
  const c = useSharedValue(0.25);

  useEffect(() => {
    const seq = (delay: number) =>
      withRepeat(
        withSequence(
          withTiming(0.25, { duration: delay }),
          withTiming(1, { duration: 300 }),
          withTiming(0.25, { duration: 300 }),
        ),
        -1,
      );
    a.value = seq(0);
    b.value = seq(200);
    c.value = seq(400);
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: a.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: b.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: c.value }));

  return [s1, s2, s3] as const;
}
