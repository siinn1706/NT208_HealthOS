import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/layout/Screen';
import { TopBar } from '../../src/components/layout/TopBar';
import { SectionHeader } from '../../src/components/layout/SectionHeader';
import { IconButton } from '../../src/components/primitives/IconButton';
import { Avatar } from '../../src/components/primitives/Avatar';
import { ApiState } from '../../src/components/api/ApiState';
import { KpiGridSkeleton, ChartSkeleton } from '../../src/components/api/Skeletons';
import { HeroScoreCard } from '../../src/components/home/HeroScoreCard';
import { KpiRingGrid } from '../../src/components/home/KpiRingGrid';
import { NextUpRow } from '../../src/components/home/NextUpRow';
import { AiInsightCard } from '../../src/components/home/AiInsightCard';
import { VitalsMiniCard } from '../../src/components/home/VitalsMiniCard';
import { QuickActionGrid } from '../../src/components/home/QuickActionGrid';
import { IconSearch, IconBell } from '../../src/icons';
import { useGreeting } from '../../src/hooks/use-greeting';
import { useTheme } from '../../src/theme/useTheme';
import { useApiQuery } from '../../src/api/query';
import { dashboardService } from '../../src/api/services';
import { queryKeys } from '../../src/api/queryKeys';
import { toHomeView } from '../../src/api/viewModels';
import { useSession } from '../../src/auth/SessionProvider';
import type { DashboardSummary, Reminder, VitalPoint } from '../../../shared/api-contracts';

const quickActions = [
  { id: 'meal', label: 'Meal', icon: 'IconCoffee', route: '/meals' },
  { id: 'vitals', label: 'Vitals', icon: 'IconActivity', route: '/home/vitals' },
  { id: 'ai', label: 'AI', icon: 'IconSparkle', route: '/(tabs)/chat' },
  { id: 'insights', label: 'Insights', icon: 'IconTrendUp', route: '/insights' },
];

export default function HomeScreen() {
  const t = useTheme();
  const { user } = useSession();
  const greeting = useGreeting(user?.display_name?.split(' ')[0] ?? 'there');
  const loadHome = useCallback(async () => {
    const [summary, reminders, vitalPoints] = await Promise.all([
      dashboardService.summary(),
      dashboardService.upcomingReminders(),
      dashboardService.vitals(7),
    ]);
    return { summary, reminders, vitalPoints };
  }, []);
  const home = useApiQuery<{
    summary: DashboardSummary;
    reminders: Reminder[];
    vitalPoints: VitalPoint[];
  }>(queryKeys.dashboard, loadHome);
  const model = home.data ? toHomeView(home.data.summary, home.data.reminders, home.data.vitalPoints) : null;

  return (
    <Screen>
      <TopBar
        title={greeting}
        subtitle="Synced with HealthOS Core"
        left={<Avatar name={user?.display_name ?? 'HealthOS User'} size={36} />}
        right={
          <View style={styles.actions}>
            <IconButton icon={<IconSearch size={20} color={t.ink3} />} accessibilityLabel="Search" onPress={() => router.push('/home/today')} />
            <IconButton icon={<IconBell size={20} color={t.ink3} />} accessibilityLabel="Notifications" dot onPress={() => router.push('/home/today')} />
          </View>
        }
      />

      {home.isLoading && (
        <ApiState title="Loading dashboard" loading skeleton={<><KpiGridSkeleton /><ChartSkeleton /></>} />
      )}
      {home.error && (
        <ApiState
          title="Dashboard unavailable"
          message={home.error.message}
          actionLabel="Retry"
          onAction={home.reload}
        />
      )}
      {!home.isLoading && !home.error && !model && (
        <ApiState title="No dashboard data" message="Core returned no dashboard summary for this account." />
      )}

      {model && (
        <>
          <HeroScoreCard value={model.score.value} target={model.score.target} copy={model.score.copy} onPress={() => router.push('/home/score')} />

          {model.kpis.length > 0 ? (
            <KpiRingGrid items={model.kpis} onItemPress={() => router.push('/home/today')} />
          ) : (
            <ApiState title="No KPI data" message="Connect health data or goals to populate this section." />
          )}

          <SectionHeader title="Next up" action="See all" onActionPress={() => router.push('/home/today')} />
          {model.nextUp.length > 0 ? (
            model.nextUp.map((item) => (
              <NextUpRow
                key={item.id}
                {...item}
                onPress={() => {
                  if (item.icon === 'IconPill') router.push('/(tabs)/meds');
                  else if (item.icon === 'IconVideo') router.push('/(tabs)/care');
                  else router.push('/home/today');
                }}
              />
            ))
          ) : (
            <ApiState title="Nothing scheduled" message="Upcoming reminders will appear here." />
          )}

          <SectionHeader title="AI Insight" />
          {model.aiInsight ? (
            <AiInsightCard title={model.aiInsight.title} body={model.aiInsight.body} onPress={() => router.push('/insights' as never)} />
          ) : (
            <ApiState title="No AI insight yet" message="Insights appear after enough health signals are available." />
          )}

          <SectionHeader title="Vitals" action="Report" onActionPress={() => router.push('/home/vitals')} />
          {model.vitals.avg > 0 ? (
            <VitalsMiniCard avg={model.vitals.avg} trend={model.vitals.trend} deltaBpm={model.vitals.deltaBpm} onPress={() => router.push('/home/vitals')} />
          ) : (
            <ApiState title="No vitals yet" message="Vitals from Core will appear after sync or manual entry." />
          )}
        </>
      )}

      <SectionHeader title="Quick actions" />
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
