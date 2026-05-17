// Segmented tabs used at top of all Insights screens (Reports | Risks | Goals)
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';

type InsightsTab = 'reports' | 'risk' | 'goals';

interface InsightsSegmentedTabsProps { active: InsightsTab; }

export function InsightsSegmentedTabs({ active }: InsightsSegmentedTabsProps) {
  const t = useTheme();
  const { t: i18n } = useTranslation();

  const TABS: { key: InsightsTab; label: string; route: string }[] = [
    { key: 'reports', label: i18n('insights.tabReports'), route: '/insights/reports' },
    { key: 'risk',    label: i18n('insights.tabRisks'),   route: '/insights/risk'    },
    { key: 'goals',   label: i18n('insights.tabGoals'),   route: '/insights/goals'   },
  ];
  return (
    <View style={[styles.container, { backgroundColor: t.brandSoft, borderRadius: t.radius.lg }]}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => !isActive && router.replace(tab.route as never)}
            style={[
              styles.tab,
              { borderRadius: t.radius.sm },
              isActive && {
                backgroundColor: t.card,
                ...t.shadows.card,
                shadowColor: t.shadows.card.shadowColor,
              },
            ]}
          >
            <Text
              style={[
                typography.chip,
                {
                  color: isActive
                    ? t.ink
                    : t.ink3,
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', padding: 4, marginBottom: 4 },
  tab:       { flex: 1, alignItems: 'center', paddingVertical: 6 },
});
