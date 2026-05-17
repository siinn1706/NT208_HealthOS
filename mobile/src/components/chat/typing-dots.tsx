import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '../../theme/useTheme';
import { useTypingDots } from '../../animations/useTypingDots';

export function TypingDots() {
  const t = useTheme();
  const [s1, s2, s3] = useTypingDots();

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
