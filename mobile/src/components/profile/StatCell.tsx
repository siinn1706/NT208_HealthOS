import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';

interface StatCellProps {
  label: string;
  value: string;
}

export function StatCell({ label, value }: StatCellProps) {
  const t = useTheme();
  return (
    <View style={styles.cell}>
      <Text style={[typography.title, { color: t.ink }]}>{value}</Text>
      <Text style={[typography.micro,  { color: t.ink3, marginTop: 2 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, alignItems: 'center', paddingVertical: 12 },
});
