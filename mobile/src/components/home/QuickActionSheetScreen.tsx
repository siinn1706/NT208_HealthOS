import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../layout/Screen';
import { TopBar } from '../layout/TopBar';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';

const ACTIONS = [
  { id: 'vitals', label: 'Log vitals', route: '/home/vitals', color: '#1965B3' },
  { id: 'meal', label: 'Patient intake', route: '/forms/intake', color: '#D97706' },
  { id: 'appointment', label: 'Book appointment', route: '/care/appointments/new', color: '#7C3AED' },
  { id: 'meds', label: 'View meds', route: '/(tabs)/meds', color: '#41BCE6' },
  { id: 'emergency', label: 'Emergency card', route: '/(tabs)/me', color: '#DC2626' },
];

function ActionCell({ label, route, color }: (typeof ACTIONS)[0]) {
  const t = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.cell,
        { backgroundColor: t.card, borderRadius: t.radius.lg, opacity: pressed ? 0.75 : 1 },
      ]}
      onPress={() => router.push(route as never)}
      accessibilityLabel={label}
    >
      <View style={[styles.iconBox, { backgroundColor: color + '18' }]}>
        <Text style={[typography.h3, { color }]}>{label.slice(0, 1)}</Text>
      </View>
      <Text style={[typography.caption, styles.cellLabel, { color: t.ink }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export function QuickActionSheetScreen() {
  const t = useTheme();
  return (
    <Screen>
      <TopBar
        title="Quick Actions"
        left={<Text style={[typography.body, { color: t.primary }]} onPress={() => router.back()}>Back</Text>}
      />
      <View style={styles.grid}>
        {ACTIONS.map((a) => <ActionCell key={a.id} {...a} />)}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell:     { width: '47%', alignItems: 'center', padding: 20, gap: 10 },
  iconBox:  { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cellLabel:{ textAlign: 'center', fontWeight: '500' as any },
});
