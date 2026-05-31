import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../layout/screen';
import { TopBar } from '../layout/top-bar';
import { ApiState } from '../api/api-state';
import { dashboardService } from '../../api/services';
import { useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconSparkle } from '../../icons';
import { ChevronRight } from 'lucide-react-native';
import type { DashboardSummary, KpiValue } from '../../../../shared/api-contracts';

const INSIGHT_KEY_MAP: Record<string, { title: string; body: string }> = {
  CALORIE_LOW: {
    title: 'home.insightCalorieLowTitle',
    body: 'home.insightCalorieLowBody',
  },
  CALORIE_HIGH: {
    title: 'home.insightCalorieHighTitle',
    body: 'home.insightCalorieHighBody',
  },
  CALORIE_NORMAL: {
    title: 'home.insightCalorieNormalTitle',
    body: 'home.insightCalorieNormalBody',
  },
  ACTIVITY_GOOD: {
    title: 'home.insightActivityGoodTitle',
    body: 'home.insightActivityGoodBody',
  },
};

function humanizeCode(value: string) {
  return value
    .replace(/[_-]/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function labelize(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatKpi(value: KpiValue) {
  if (value.current === null || value.current === undefined) return 'No reading';
  const current = Math.round(value.current).toLocaleString();
  if (value.target === null || value.target === undefined) return current;
  return `${current} / ${Math.round(value.target).toLocaleString()}`;
}

function insightText(summary: DashboardSummary, translate: (key: string) => string) {
  const rawCode = summary.ai_insight?.insight_code ?? summary.ai_insight?.text ?? '';
  const mapped = INSIGHT_KEY_MAP[rawCode];
  if (!mapped) {
    const title = summary.ai_insight?.category ? labelize(summary.ai_insight.category) : translate('home.aiInsightTitle');
    return {
      title,
      body: rawCode ? humanizeCode(rawCode) : translate('home.noAiInsightMessage'),
    };
  }

  return {
    title: translate(mapped.title),
    body: translate(mapped.body),
  };
}

function primaryRoute(summary: DashboardSummary) {
  const category = summary.ai_insight?.category;
  if (category === 'nutrition') return '/meals';
  if (category === 'activity') return '/home/vitals';
  return '/insights';
}

export function AiInsightDetailScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const loadSummary = useCallback(() => dashboardService.summary(), []);
  const insight = useApiQuery(`${queryKeys.dashboard}.insight`, loadSummary);

  const model = useMemo(() => {
    if (!insight.data) return null;
    const copy = insightText(insight.data, i18n);
    return {
      ...copy,
      route: primaryRoute(insight.data),
      alerts: insight.data.alerts ?? [],
      kpis: Object.entries(insight.data.kpis ?? {}).slice(0, 4),
    };
  }, [insight.data, i18n]);

  return (
    <Screen>
      <TopBar
        title={i18n('home.aiInsightTitle')}
        left={<Text style={[typography.body, { color: t.brand }]} onPress={() => router.back()}>{i18n('common.back')}</Text>}
      />

      {insight.isLoading && <ApiState title={i18n('home.loadingDashboard')} loading />}
      {insight.error && <ApiState title={i18n('home.dashboardUnavailable')} message={insight.error.message} actionLabel={i18n('common.retry')} onAction={insight.reload} />}
      {!insight.isLoading && !insight.error && !model && (
        <ApiState title={i18n('home.noAiInsight')} message={i18n('home.noAiInsightMessage')} />
      )}

      {model && (
        <View style={styles.content}>
          <LinearGradient
            colors={[t.brandSoft, t.brandSoft + 'CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, { borderRadius: t.radius.xl }]}
          >
            <View style={[styles.aiIconBox, { backgroundColor: t.brand, borderRadius: 12 }]}>
              <IconSparkle size={24} color="#FFFFFF" />
            </View>
            <Text style={[typography.title, { color: t.ink, marginTop: 12 }]}>{model.title}</Text>
            <Text style={[typography.body, { color: t.ink3, marginTop: 6 }]}>{model.body}</Text>
          </LinearGradient>

          <Text style={[typography.caption, styles.sectionLabel, { color: t.ink3 }]}>
            {i18n('home.currentSignals')}
          </Text>
          <View style={[styles.list, { backgroundColor: t.card, borderRadius: t.radius.lg }]}>
            {model.alerts.length === 0 && model.kpis.length === 0 && (
              <Text style={[typography.caption, { color: t.ink3, padding: 16 }]}>{i18n('home.noKpiInputs')}</Text>
            )}
            {model.alerts.map((alert) => (
              <View key={alert.id} style={[styles.signalRow, { borderBottomColor: t.border }]}>
                <Text style={[typography.bodyMed, { color: t.ink, flex: 1 }]}>{humanizeCode(alert.alert_code ?? alert.message)}</Text>
                <Text style={[typography.caption, { color: alert.type === 'critical' ? t.danger : t.warning }]}>{humanizeCode(alert.type)}</Text>
              </View>
            ))}
            {model.kpis.map(([key, value]) => (
              <View key={key} style={[styles.signalRow, { borderBottomColor: t.border }]}>
                <Text style={[typography.bodyMed, { color: t.ink, flex: 1 }]}>{labelize(key)}</Text>
                <Text style={[typography.caption, { color: t.ink3 }]}>{formatKpi(value)}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.list, { backgroundColor: t.card, borderRadius: t.radius.lg }]}>
            <Pressable style={styles.actionRow} onPress={() => router.push(model.route as never)}>
              <Text style={[typography.body, { color: t.ink, flex: 1 }]}>{i18n('home.viewRelatedMetrics')}</Text>
              <ChevronRight size={18} color={t.ink4} />
            </Pressable>
            <View style={[styles.actionDivider, { backgroundColor: t.border }]} />
            <Pressable style={styles.actionRow} onPress={() => router.push('/insights' as never)}>
              <Text style={[typography.body, { color: t.ink, flex: 1 }]}>{i18n('home.openInsights')}</Text>
              <ChevronRight size={18} color={t.ink4} />
            </Pressable>
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content:       { gap: 16, paddingBottom: 24 },
  hero:          { padding: 20 },
  aiIconBox:     { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  sectionLabel:  { letterSpacing: 0.6, textTransform: 'uppercase' },
  list:          { overflow: 'hidden' },
  signalRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  actionRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  actionDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
});
