import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';

interface SegmentedControlProps {
  options: string[];
  value: string;
  onChange: (option: string) => void;
}

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  const t = useTheme();
  const idx = options.indexOf(value);
  const indicatorX = useSharedValue(idx);
  const tabW = 100 / options.length;

  const indicatorStyle = useAnimatedStyle(() => ({
    left: withTiming(`${indicatorX.value * tabW}%`, { duration: t.motion.durations.fast }),
    width: `${tabW}%`,
  }));

  function handlePress(option: string, i: number) {
    indicatorX.value = i;
    onChange(option);
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bgElev, borderRadius: t.radius.pill }]}>
      <Animated.View
        style={[
          styles.indicator,
          indicatorStyle,
          { backgroundColor: t.card, borderRadius: t.radius.pill, ...t.shadows.card },
        ]}
      />
      {options.map((option, i) => (
        <Pressable key={option} onPress={() => handlePress(option, i)} style={styles.tab}>
          <Text
            style={[
              typography.caption,
              { color: value === option ? t.ink : t.ink3, fontFamily: 'Inter_500Medium' },
            ]}
          >
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', padding: 3, position: 'relative' },
  indicator: { position: 'absolute', top: 3, bottom: 3 },
  tab:       { flex: 1, alignItems: 'center', paddingVertical: 7, zIndex: 1 },
});
