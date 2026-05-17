import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';

export function DateChip({ label }: { label: string }) {
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.chip, { backgroundColor: t.bgElev, borderRadius: t.radius.pill }]}>
        <Text style={[typography.micro, { color: t.ink3 }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: 12 },
  chip: { paddingHorizontal: 16, paddingVertical: 8 },
});
