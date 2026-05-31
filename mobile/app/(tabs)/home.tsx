import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/layout/screen';
import { TopBar } from '../../src/components/layout/top-bar';
import { SectionHeader } from '../../src/components/layout/section-header';
import { IconButton } from '../../src/components/primitives/icon-button';
import { Avatar } from '../../src/components/primitives/avatar';
import { ApiState } from '../../src/components/api/api-state';
import { KpiGridSkeleton, ChartSkeleton } from '../../src/components/api/skeletons';
import { HeroScoreCard } from '../../src/components/home/hero-score-card';
import { KpiRingGrid } from '../../src/components/home/kpi-ring-grid';
import { NextUpRow } from '../../src/components/home/next-up-row';
import { AiInsightCard } from '../../src/components/home/ai-insight-card';
import { VitalsMiniCard } from '../../src/components/home/vitals-mini-card';
import { QuickActionGrid } from '../../src/components/home/quick-action-grid';
import { IconSearch, IconBell } from '../../src/icons';
import { useGreetingTitle } from '../../src/hooks/use-greeting';
import { useTheme } from '../../src/theme/useTheme';
import { useTranslation } from 'react-i18next';
import { useApiQuery } from '../../src/api/query';
import { dashboardService } from '../../src/api/services';
import { queryKeys } from '../../src/api/queryKeys';
import { toHomeView } from '../../src/api/viewModels';
import { humanizeError } from '../../src/api/error-message';
import { useSession } from '../../src/auth/session-provider';
import type { DashboardSummary, Reminder, VitalPoint } from '../../../shared/api-contracts';

export default function HomeScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const { user } = useSession();
  const greetingTitle = useGreetingTitle();
  const firstName = user?.display_name?.split(' ')[0] ?? 'there';
  const dateLine = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
    [],
  );
  const quickActions = useMemo(
    () => [
      { id: 'meal', label: i18n('home.quickActionMeal'), icon: 'IconCoffee', route: '/meals' },
      { id: 'vitals', label: i18n('home.quickActionVitals'), icon: 'IconActivity', route: '/home/vitals' },
      { id: 'ai', label: i18n('home.quickActionAi'), icon: 'IconSparkle', route: '/chat' },
      { id: 'insights', label: i18n('home.quickActionInsights'), icon: 'IconTrendUp', route: '/insights' },
    ],
    [i18n],
  );
  const loadHome = useCallback(async () => {
    const [summaryResult, remindersResult, vitalsResult] = await Promise.allSettled([
      dashboardService.summary(),
      dashboardService.upcomingReminders(),
      dashboardService.vitals(7),
    ]);
    return {
      summary: summaryResult.status === 'fulfilled' ? summaryResult.value : null,
      reminders: remindersResult.status === 'fulfilled' ? remindersResult.value : [],
      vitalPoints: vitalsResult.status === 'fulfilled' ? vitalsResult.value : [],
    };
  }, []);
  const home = useApiQuery<{
    summary: DashboardSummary | null;
    reminders: Reminder[];
    vitalPoints: VitalPoint[];
  }>(queryKeys.dashboard, loadHome);
  const model = home.data?.summary ? toHomeView(home.data.summary, home.data.reminders, home.data.vitalPoints) : null;

  return (
    <Screen>
      <TopBar
        title={greetingTitle}
        subtitle={`${firstName} · ${dateLine}`}
        left={<Avatar name={user?.display_name ?? 'HealthOS User'} size={36} />}
        right={
          <View style={styles.actions}>
            <IconButton variant="subtle" icon={<IconSearch size={20} color={t.ink3} />} accessibilityLabel={i18n('home.searchAccessibility')} onPress={() => router.push('/home/today')} />
            <IconButton variant="subtle" icon={<IconBell size={20} color={t.ink3} />} accessibilityLabel={i18n('home.notificationsAccessibility')} dot onPress={() => router.push('/home/today')} />
          </View>
        }
      />

      {home.isLoading && (
        <ApiState title={i18n('home.loadingDashboard')} loading skeleton={<><KpiGridSkeleton /><ChartSkeleton /></>} />
      )}
      {home.error && (
        <ApiState
          title={i18n('home.dashboardUnavailable')}
          message={humanizeError(home.error)}
          actionLabel={i18n('common.retry')}
          onAction={home.reload}
        />
      )}
      {!home.isLoading && !home.error && !model && (
        <ApiState title={i18n('home.noDashboardData')} message={i18n('home.dashboardEmptyMessage')} />
      )}

      {model && (
        <>
          <HeroScoreCard value={model.score.value} target={model.score.target} copy={model.score.copy} onPress={() => router.push('/home/score')} />

          {model.kpis.length > 0 ? (
            <KpiRingGrid items={model.kpis} onItemPress={() => router.push('/home/today')} />
          ) : (
            <ApiState title={i18n('home.noKpis')} message={i18n('home.noKpisMessage')} />
          )}

          <SectionHeader title={i18n('home.nextUp')} action={i18n('common.seeAll')} onActionPress={() => router.push('/home/today')} />
          {model.nextUp.length > 0 ? (
            model.nextUp.map((item) => (
              <NextUpRow
                key={item.id}
                {...item}
                onPress={() => {
                  if (item.icon === 'IconPill') router.push('/meds');
                  else if (item.icon === 'IconVideo') router.push('/care');
                  else router.push('/home/today');
                }}
              />
            ))
          ) : (
            <ApiState title={i18n('home.nothingScheduled')} message={i18n('home.nothingScheduledMessage')} />
          )}

          <SectionHeader title={i18n('home.aiInsightCard')} />
          {model.aiInsight ? (
            <AiInsightCard title={model.aiInsight.title} body={model.aiInsight.body} onPress={() => router.push('/home/insight/current' as never)} />
          ) : (
            <ApiState title={i18n('home.noAiInsight')} message={i18n('home.noAiInsightMessage')} />
          )}

          <SectionHeader title={i18n('home.vitals')} action={i18n('home.reportAction')} onActionPress={() => router.push('/home/vitals')} />
          {model.vitals.avg > 0 ? (
            <VitalsMiniCard avg={model.vitals.avg} trend={model.vitals.trend} deltaBpm={model.vitals.deltaBpm} onPress={() => router.push('/home/vitals')} />
          ) : (
            <ApiState title={i18n('home.noVitals')} message={i18n('home.noVitalsMessage')} />
          )}
        </>
      )}

      <SectionHeader title={i18n('home.quickActions')} />
      <QuickActionGrid
        actions={quickActions}
        onPress={(id) => {
          const action = quickActions.find((item) => item.id === id);
          if (action) router.push(action.route as never);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 4 },
});
