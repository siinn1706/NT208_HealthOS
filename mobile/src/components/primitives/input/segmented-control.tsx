import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';

interface SegmentedControlProps {
  options: string[];
  value: string;
  onChange: (option: string) => void;
}

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  const t = useTheme();
  const idx = Math.max(0, options.indexOf(value));
  const tabW = 100 / options.length;

  function handlePress(option: string) {
    onChange(option);
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bgElev, borderRadius: t.radius.pill }]}>
      <View
        style={[
          styles.indicator,
          { left: `${idx * tabW}%`, width: `${tabW}%` },
          { backgroundColor: t.card, borderRadius: t.radius.pill, ...t.shadows.card },
        ]}
      />
      {options.map((option, i) => (
        <Pressable key={option} onPress={() => handlePress(option)} style={styles.tab}>
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
