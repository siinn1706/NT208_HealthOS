import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useTheme } from '../../theme/useTheme';

export function TypingDots() {
  const t = useTheme();
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
        -1
      );
    a.value = seq(0);
    b.value = seq(200);
    c.value = seq(400);
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: a.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: b.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: c.value }));

  return (
    <View style={styles.row}>
      {([s1, s2, s3] as const).map((s, i) => (
        <Animated.View key={i} style={[styles.dot, { backgroundColor: t.ink3 }, s]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
