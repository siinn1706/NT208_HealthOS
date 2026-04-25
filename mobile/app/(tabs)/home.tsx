import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/layout/Screen';
import { TopBar } from '../../src/components/layout/TopBar';
import { SectionHeader } from '../../src/components/layout/SectionHeader';
import { IconButton } from '../../src/components/primitives/IconButton';
import { Avatar } from '../../src/components/primitives/Avatar';
import { HeroScoreCard } from '../../src/components/home/HeroScoreCard';
import { KpiRingGrid } from '../../src/components/home/KpiRingGrid';
import { NextUpRow } from '../../src/components/home/NextUpRow';
import { AiInsightCard } from '../../src/components/home/AiInsightCard';
import { VitalsMiniCard } from '../../src/components/home/VitalsMiniCard';
import { QuickActionGrid } from '../../src/components/home/QuickActionGrid';
import { IconSearch, IconBell } from '../../src/icons';
import { useGreeting } from '../../src/hooks/use-greeting';
import { todayScore, kpis, nextUp, aiInsight, vitals, quickActions } from '../../src/mocks/home';
import { useTheme } from '../../src/theme/useTheme';

export default function HomeScreen() {
  const t = useTheme();
  const greeting = useGreeting('Minh');

  return (
    <Screen>
      <TopBar
        title={greeting}
        subtitle="Tue, Apr 24"
        left={<Avatar name="Minh Nguyen" size={36} />}
        right={
          <View style={styles.actions}>
            <IconButton icon={<IconSearch size={20} color={t.ink3} />} accessibilityLabel="Search" />
            <IconButton icon={<IconBell size={20} color={t.ink3} />} accessibilityLabel="Notifications" dot />
          </View>
        }
      />

      <HeroScoreCard value={todayScore.value} target={todayScore.target} copy={todayScore.copy} />

      <KpiRingGrid items={kpis} />

      <SectionHeader title="Next up" action="See all" />
      {nextUp.map((item) => (
        <NextUpRow key={item.id} {...item} />
      ))}

      <SectionHeader title="AI Insight" />
      <AiInsightCard title={aiInsight.title} body={aiInsight.body} />

      <SectionHeader title="Vitals" action="Report" />
      <VitalsMiniCard avg={vitals.avg} trend={vitals.trend} deltaBpm={vitals.deltaBpm} />

      <SectionHeader title="Quick actions" />
      <QuickActionGrid
        actions={quickActions}
        onPress={(id) => id === 'ai' && router.push('/chat/ai')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 4 },
});
