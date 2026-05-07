import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { MissingApiState } from '../api/ApiState';
import { IconSparkle } from '../../icons';
import { Button } from '../primitives/Button';
import { Screen } from '../layout/Screen';
import { TopBar } from '../layout/TopBar';
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

const AI_INSIGHT_CAUSES = [
  'Your heart rate variability has been trending lower over the past week.',
  'Sleep data shows reduced deep-sleep minutes on 4 of the last 7 nights.',
  'Step count was below your 7,000-step goal on 3 consecutive days.',
];

const AI_INSIGHT_ACTIONS = [
  { label: 'Review heart rate trends', route: '/home/vitals' },
  { label: 'View sleep report',        route: '/insights' },
  { label: 'Check activity log',       route: '/insights' },
];

function AiInsightDetailScreen() {
  const t = useTheme();
  return (
    <Screen>
      <TopBar
        title="AI Insight"
        left={<Text style={[typography.body, { color: t.brand }]} onPress={() => router.back()}>Back</Text>}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
        {/* Hero card */}
        <View style={[styles.aiHero, { backgroundColor: t.brandSoft, borderRadius: t.radius.xl }]}>
          <View style={[styles.aiIconBox, { backgroundColor: t.card, borderRadius: t.radius.md }]}>
            <IconSparkle size={24} color={t.brand} />
          </View>
          <Text style={[typography.title, { color: t.ink, marginTop: 12 }]}>
            Your recovery score dropped 12% this week
          </Text>
          <Text style={[typography.body, { color: t.ink3, marginTop: 6 }]}>
            Based on heart rate, sleep, and activity data from the last 7 days.
          </Text>
        </View>

        {/* Causes */}
        <Text style={[typography.caption, { color: t.ink3, letterSpacing: 0.6, textTransform: 'uppercase' }]}>
          Why this matters
        </Text>
        {AI_INSIGHT_CAUSES.map((cause, i) => (
          <View key={i} style={styles.causeRow}>
            <View style={[styles.causeDot, { backgroundColor: t.brand }]} />
            <Text style={[typography.caption, { color: t.ink2, flex: 1 }]}>{cause}</Text>
          </View>
        ))}

        {/* Actions */}
        <Text style={[typography.caption, { color: t.ink3, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 4 }]}>
          Recommendations
        </Text>
        <View style={[styles.actionList, { backgroundColor: t.card, borderRadius: t.radius.lg }]}>
          {AI_INSIGHT_ACTIONS.map((action, i) => (
            <View key={i}>
              {i > 0 && <View style={[styles.actionDivider, { backgroundColor: t.border }]} />}
              <Pressable
                style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => router.push(action.route as never)}
              >
                <Text style={[typography.body, { color: t.ink, flex: 1 }]}>{action.label}</Text>
                <ChevronRight size={18} color={t.ink4} />
              </Pressable>
            </View>
          ))}
        </View>

        <Button label="View related metrics" variant="soft" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}

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
    case 'insight':      return <AiInsightDetailScreen />;
    default:             return <GuardedDetailScreen kind={kind} />;
  }
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  container:     { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  back:          { fontSize: 15, marginBottom: 16 },
  title:         { fontSize: 26, fontWeight: '700', marginBottom: 8 },
  aiHero:        { padding: 20 },
  aiIconBox:     { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  causeRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  causeDot:      { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  actionList:    { overflow: 'hidden' },
  actionRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  actionDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
});
