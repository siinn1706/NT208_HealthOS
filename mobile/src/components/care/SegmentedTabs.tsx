import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';

interface SegmentedTabsProps {
  tabs: string[];
  value: string;
  onChange: (tab: string) => void;
}

export function SegmentedTabs({ tabs, value, onChange }: SegmentedTabsProps) {
  const t = useTheme();
  const idx = tabs.indexOf(value);
  const indicatorX = useSharedValue(idx);

  const tabW = 100 / tabs.length;

  const indicatorStyle = useAnimatedStyle(() => ({
    left: withTiming(`${indicatorX.value * tabW}%`, { duration: 200 }),
    width: `${tabW}%`,
  }));

  function handlePress(tab: string, i: number) {
    indicatorX.value = i;
    onChange(tab);
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bgElev, borderRadius: t.radius.pill }]}>
      <Animated.View
        style={[
          styles.indicator,
          indicatorStyle,
          { backgroundColor: t.card, borderRadius: t.radius.pill },
        ]}
      />
      {tabs.map((tab, i) => (
        <Pressable key={tab} onPress={() => handlePress(tab, i)} style={styles.tab}>
          <Text
            style={[
              typography.caption,
              { color: value === tab ? t.ink : t.ink3, fontFamily: 'Inter_500Medium' },
            ]}
          >
            {tab}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', padding: 3, marginVertical: 8, position: 'relative' },
  indicator: { position: 'absolute', top: 3, bottom: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  tab:       { flex: 1, alignItems: 'center', paddingVertical: 7, zIndex: 1 },
});
