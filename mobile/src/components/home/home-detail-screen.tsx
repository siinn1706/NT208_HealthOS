import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { MissingApiState } from '../api/api-state';
import { TodayOverviewScreen } from './today-overview-screen';
import { HealthScoreDetailScreen } from './health-score-detail-screen';
import { QuickActionSheetScreen } from './quick-action-sheet-screen';
import { VitalsDetailScreen } from './vitals-detail-screen';
import { AiInsightDetailScreen } from './ai-insight-detail-screen';

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
  const { t: i18n } = useTranslation();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <View style={styles.container}>
        <Text style={[styles.back, { color: t.brand }]} onPress={() => router.back()}>
          ← {i18n('common.back')}
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
    case 'insight':      return <AiInsightDetailScreen />;
    default:             return <GuardedDetailScreen kind={kind} />;
  }
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  container:     { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  back:          { fontSize: 15, marginBottom: 16 },
  title:         { fontSize: 26, fontWeight: '700', marginBottom: 8 },
});
