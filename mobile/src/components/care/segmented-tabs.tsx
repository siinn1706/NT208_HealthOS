import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';

interface SegmentedTabsProps {
  tabs: string[];
  value: string;
  onChange: (tab: string) => void;
}

export function SegmentedTabs({ tabs, value, onChange }: SegmentedTabsProps) {
  const t = useTheme();
  const idx = Math.max(0, tabs.indexOf(value));
  const tabW = 100 / tabs.length;

  function handlePress(tab: string) {
    onChange(tab);
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
      {tabs.map((tab, i) => (
        <Pressable key={tab} onPress={() => handlePress(tab)} style={styles.tab}>
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
  indicator: { position: 'absolute', top: 3, bottom: 3 },
  tab:       { flex: 1, alignItems: 'center', paddingVertical: 7, zIndex: 1 },
});
