import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconButton } from '../primitives/IconButton';
import {
  ChevronDown,
  HeartPulse,
  Utensils,
  CalendarPlus,
  Pill,
  AlertCircle,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';

const ACTIONS: { id: string; label: string; route: string; color: string; Icon: LucideIcon }[] = [
  { id: 'vitals',       label: 'Log vitals',       route: '/home/vitals',           color: '#1965B3', Icon: HeartPulse },
  { id: 'meal',         label: 'Patient intake',    route: '/forms/intake',          color: '#D97706', Icon: Utensils },
  { id: 'appointment',  label: 'Book appointment',  route: '/care/appointments/new', color: '#7C3AED', Icon: CalendarPlus },
  { id: 'meds',         label: 'View meds',         route: '/(tabs)/meds',           color: '#41BCE6', Icon: Pill },
  { id: 'emergency',    label: 'Emergency card',    route: '/(tabs)/me',             color: '#DC2626', Icon: AlertCircle },
  { id: 'ai',           label: 'Ask AI',            route: '/(tabs)/chat',           color: '#12A88A', Icon: Sparkles },
];

function ActionCell({ label, route, color, Icon }: (typeof ACTIONS)[0]) {
  const t = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.cell,
        { backgroundColor: t.bgElev, borderRadius: t.radius.lg, opacity: pressed ? 0.75 : 1 },
      ]}
      onPress={() => router.push(route as never)}
      accessibilityLabel={label}
    >
      <View style={[styles.iconBox, { backgroundColor: color + '18', borderRadius: t.radius.md }]}>
        <Icon size={22} color={color} />
      </View>
      <Text style={[typography.caption, styles.cellLabel, { color: t.ink, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export function QuickActionSheetScreen() {
  const t = useTheme();
  return (
    <SafeAreaView style={[styles.scrim]} edges={['bottom']}>
      <View style={[styles.sheet, { backgroundColor: t.card, ...t.shadows.sheet }]}>
        {/* Handle pill */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: t.border }]} />
        </View>

        <View style={styles.titleRow}>
          <Text style={[typography.h3, { color: t.ink }]}>Quick Actions</Text>
          <IconButton icon={<ChevronDown size={22} color={t.ink3} />} onPress={() => router.back()} accessibilityLabel="Dismiss" />
        </View>

        <View style={styles.grid}>
          {ACTIONS.map((a) => <ActionCell key={a.id} {...a} />)}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrim:      { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 24 },
  handleRow:  { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle:     { width: 36, height: 4, borderRadius: 2 },
  titleRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  cell:       { width: '30%', alignItems: 'center', padding: 14, gap: 8 },
  iconBox:    { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  cellLabel:  { textAlign: 'center' },
});
