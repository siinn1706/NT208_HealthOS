import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { MissingApiState } from '../api/ApiState';
import { TodayOverviewScreen } from './TodayOverviewScreen';
import { HealthScoreDetailScreen } from './HealthScoreDetailScreen';
import { QuickActionSheetScreen } from './QuickActionSheetScreen';
import { VitalsDetailScreen } from './VitalsDetailScreen';

export type HomeDetailKind = 'today' | 'score' | 'vitals' | 'insight' | 'quick-action';

interface HomeDetailScreenProps {
  kind: HomeDetailKind;
}

const TITLES: Record<HomeDetailKind, string> = {
  today:        'Today\'s Overview',
  score:        'Health Score',
  vitals:       'Vitals',
  insight:      'AI Insight',
  'quick-action': 'Quick Actions',
};

function GuardedDetailScreen({ kind }: { kind: HomeDetailKind }) {
  const t = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <View style={styles.container}>
        <Text style={[styles.back, { color: t.brand }]} onPress={() => router.back()}>
          ← Back
        </Text>
        <Text style={[styles.title, { color: t.ink }]}>{TITLES[kind]}</Text>
        <MissingApiState title={`${TITLES[kind]} unavailable`} contract="existing API needs adaptation" />
      </View>
    </SafeAreaView>
  );
}

export function HomeDetailScreen({ kind }: HomeDetailScreenProps) {
  switch (kind) {
    case 'today':        return <TodayOverviewScreen />;
    case 'score':        return <HealthScoreDetailScreen />;
    case 'vitals':       return <VitalsDetailScreen />;
    case 'quick-action': return <QuickActionSheetScreen />;
    default:             return <GuardedDetailScreen kind={kind} />;
  }
}

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  back:      { fontSize: 15, marginBottom: 16 },
  title:     { fontSize: 26, fontWeight: '700', marginBottom: 8 },
});
