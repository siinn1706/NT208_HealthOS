import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';

interface StatCellProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tint?: string;
}

export function StatCell({ label, value, icon, tint }: StatCellProps) {
  const t = useTheme();
  return (
    <View style={styles.cell}>
      {icon ? (
        <View style={[styles.tile, { backgroundColor: tint ?? t.brandSoft, borderRadius: t.radius.sm }]}>
          {icon}
        </View>
      ) : null}
      <Text style={[typography.title, { color: t.ink, marginTop: icon ? 8 : 0, fontSize: 22, fontWeight: '800' }]}>{value}</Text>
      <Text style={[typography.micro,  { color: t.ink3, marginTop: 2 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tile: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
