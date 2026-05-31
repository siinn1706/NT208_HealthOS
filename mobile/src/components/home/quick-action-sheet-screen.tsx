import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Card } from '../primitives/card';
import {
  HeartPulse,
  Utensils,
  CalendarPlus,
  Pill,
  Target,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';

type Action = { id: string; label: string; crumb: string; route: string; color: string; Icon: LucideIcon };

function ActionCell({ label, crumb, route, color, Icon }: Action) {
  const t = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [styles.cell, { opacity: pressed ? 0.75 : 1 }]}
      onPress={() => router.push(route as never)}
      accessibilityLabel={label}
    >
      <Card style={[styles.cellCard, { borderColor: t.border }]}>
        <View style={[styles.iconBox, { backgroundColor: color + '18', borderRadius: t.radius.md }]}>
          <Icon size={20} color={color} />
        </View>
        <Text style={[styles.cellLabel, { color: t.ink }]} numberOfLines={2}>{label}</Text>
        <Text style={[styles.cellCrumb, { color: t.ink4 }]} numberOfLines={1}>{crumb}</Text>
      </Card>
    </Pressable>
  );
}

export function QuickActionSheetScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();

  const ACTIONS: Action[] = [
    { id: 'scan',        label: i18n('home.quickScanMeal'),  crumb: i18n('home.quickScanCrumb'),    route: '/meals/scan',              color: '#D97706', Icon: Utensils   },
    { id: 'meds',        label: i18n('home.quickLogDose'),   crumb: i18n('home.quickLogDoseCrumb'), route: '/meds',                    color: '#41BCE6', Icon: Pill       },
    { id: 'vitals',      label: i18n('home.quickLogVitals'), crumb: i18n('home.quickVitalsCrumb'),  route: '/home/vitals',             color: '#1965B3', Icon: HeartPulse },
    { id: 'appointment', label: i18n('home.quickBookVisit'), crumb: i18n('home.quickBookCrumb'),    route: '/care/appointments/new',   color: '#7C3AED', Icon: CalendarPlus },
    { id: 'goal',        label: i18n('home.quickAddGoal'),   crumb: i18n('home.quickGoalCrumb'),    route: '/insights/goals/create',   color: '#12A88A', Icon: Target     },
    { id: 'ai',          label: i18n('home.quickAskAi'),     crumb: i18n('home.quickAiCrumb'),      route: '/chat',                    color: '#12A88A', Icon: Sparkles   },
  ];

  return (
    <SafeAreaView style={styles.scrim} edges={['bottom']}>
      <View style={[styles.sheet, { backgroundColor: t.card, ...t.shadows.sheet }]}>
        {/* Handle pill */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: t.border }]} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.microLabel, { color: t.brand }]}>{i18n('home.quickActions')}</Text>
          <Text style={[typography.h3, { color: t.ink }]}>{i18n('home.whatDoYouWant')}</Text>
        </View>

        {/* 2×3 grid */}
        <View style={styles.grid}>
          {ACTIONS.map((a) => <ActionCell key={a.id} {...a} />)}
        </View>

        {/* Cancel */}
        <Pressable
          style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => router.back()}
          accessibilityLabel={i18n('common.cancel')}
        >
          <Text style={[styles.cancelText, { color: t.brand }]}>{i18n('common.cancel')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrim:      { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,39,67,0.45)' },
  sheet:      { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handleRow:  { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle:     { width: 36, height: 4, borderRadius: 2 },
  header:     { paddingHorizontal: 20, paddingBottom: 16 },
  microLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 4 },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, marginBottom: 8 },
  cell:       { width: '47%' },
  cellCard:   { borderWidth: 1, borderRadius: 14, padding: 16, gap: 8 },
  iconBox:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  cellLabel:  { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  cellCrumb:  { fontSize: 10, lineHeight: 14 },
  cancelBtn:  { height: 46, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  cancelText: { fontSize: 15, fontWeight: '600' },
});
