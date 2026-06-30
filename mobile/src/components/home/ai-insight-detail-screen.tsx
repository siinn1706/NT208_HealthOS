import React, { useCallback } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, Pressable } from 'react-native';
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
import { normalizeLocale } from '../../i18n/supported-locales';
import type { DashboardAiAdvice, DashboardAiAdviceActionType, DashboardAiAdviceSource } from '../../../../shared/api-contracts';

const SOURCE_LABEL_KEYS: Record<DashboardAiAdviceSource, string> = {
  ai: 'home.aiAdviceSourceAi',
  rule: 'home.aiAdviceSourceRule',
  cache: 'home.aiAdviceSourceCache',
};

function adviceActionRoute(type: DashboardAiAdviceActionType) {
  const routeByType: Record<DashboardAiAdviceActionType, string> = {
    log_meal: '/meals/add',
    walk: '/home/vitals',
    sleep_hygiene: '/insights/reports',
    view_trends: '/insights/reports',
    open_chat: '/chat',
    track_vitals: '/home/vitals',
  };
  return routeByType[type];
}

function sourceLabelKey(advice: DashboardAiAdvice) {
  return advice.status === 'fallback' ? 'home.aiAdviceSourceFallback' : SOURCE_LABEL_KEYS[advice.source];
}

function formatEvidence(item: DashboardAiAdvice['evidence'][number]) {
  const unit = item.unit ? ` ${item.unit}` : '';
  const comparison = item.comparison ? ` · ${item.comparison}` : '';
  return `${item.metric}: ${item.value ?? '--'}${unit}${comparison}`;
}

export function AiInsightDetailScreen() {
  const t = useTheme();
  const { t: i18n, i18n: i18next } = useTranslation();
  const locale = normalizeLocale(i18next.language);
  const loadAdvice = useCallback(() => dashboardService.aiAdvice(locale), [locale]);
  const advice = useApiQuery(queryKeys.dashboardAiAdvice(locale), loadAdvice);
  const isAnalyzing = advice.isLoading || advice.isRefreshing;

  return (
    <Screen>
      <TopBar
        title={i18n('home.aiInsightTitle')}
        left={<Text style={[typography.body, { color: t.brand }]} onPress={() => router.back()}>{i18n('common.back')}</Text>}
      />

      {isAnalyzing && (
        <View style={styles.content}>
          <LinearGradient
            colors={[t.brandSoft, t.card]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.panel, styles.loadingPanel, { borderRadius: t.radius.xl, borderColor: t.borderStrong }]}
          >
            <View style={styles.header}>
              <View style={[styles.aiIconBox, { backgroundColor: t.brand, borderRadius: 12 }]}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
              <View style={styles.headerText}>
                <Text style={[typography.micro, { color: t.brand }]}>{i18n('home.aiInsight')}</Text>
                <Text style={[typography.title, { color: t.ink, marginTop: 6 }]}>{i18n('home.aiAdviceLoadingTitle')}</Text>
                <Text style={[typography.body, { color: t.ink3, marginTop: 6 }]}>{i18n('home.aiAdviceLoadingBody')}</Text>
              </View>
            </View>
            <View style={styles.loadingBars} accessibilityLabel={i18n('home.aiAdviceLoadingTitle')}>
              {[0, 1, 2].map((item) => (
                <View key={item} style={[styles.loadingBar, { backgroundColor: t.brand }]} />
              ))}
            </View>
          </LinearGradient>
        </View>
      )}

      {!isAnalyzing && (advice.error || !advice.data) && (
        <ApiState
          title={i18n('home.aiAdviceUnavailable')}
          message={i18n('home.aiAdviceUnavailableMessage')}
          actionLabel={i18n('common.retry')}
          onAction={advice.reload}
        />
      )}

      {!isAnalyzing && !advice.error && advice.data && (
        <View style={styles.content}>
          <LinearGradient
            colors={[advice.data.status === 'fallback' ? t.warningSoft : t.brandSoft, t.card]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.panel,
              {
                borderRadius: t.radius.xl,
                borderColor: advice.data.status === 'fallback' ? t.warning : t.borderStrong,
              },
            ]}
          >
            <View style={styles.header}>
              <View style={[styles.aiIconBox, { backgroundColor: t.brand, borderRadius: 12 }]}>
                <IconSparkle size={24} color="#FFFFFF" />
              </View>
              <View style={styles.headerText}>
                <View style={styles.eyebrowRow}>
                  <Text style={[typography.micro, { color: t.brand }]}>{i18n('home.aiInsight')}</Text>
                  <View style={[styles.statusPill, { backgroundColor: t.card, borderColor: t.borderStrong }]}>
                    <Text style={[typography.micro, { color: advice.data.status === 'fallback' ? t.warning : t.ink3 }]}>
                      {i18n(sourceLabelKey(advice.data))}
                    </Text>
                  </View>
                </View>
                <Text style={[typography.title, { color: t.ink, marginTop: 8 }]}>{advice.data.title}</Text>
                <Text style={[typography.body, { color: t.ink3, marginTop: 6 }]}>{advice.data.body}</Text>
              </View>
            </View>

            {advice.data.evidence.length > 0 && (
              <View style={styles.section}>
                <Text style={[typography.caption, styles.sectionLabel, { color: t.ink3 }]}>
                  {i18n('home.aiAdviceEvidence')}
                </Text>
                <View style={styles.evidenceRow}>
                  {advice.data.evidence.map((item) => (
                    <View key={`${item.metric}-${item.value}`} style={[styles.evidencePill, { backgroundColor: t.card }]}>
                      <Text style={[typography.micro, { color: t.ink3 }]}>{formatEvidence(item)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {advice.data.actions.length > 0 && (
              <View style={styles.actionList}>
                {advice.data.actions.slice(0, 2).map((action, index) => (
                  <Pressable
                    key={action.id}
                    style={[
                      styles.actionButton,
                      index === 0
                        ? { backgroundColor: t.brand, borderColor: t.brand }
                        : { backgroundColor: t.card, borderColor: t.borderStrong },
                    ]}
                    onPress={() => router.push(adviceActionRoute(action.type) as never)}
                  >
                    <Text style={[typography.caption, { color: index === 0 ? t.onBrand : t.brand }]}>{action.label}</Text>
                    <ChevronRight size={16} color={index === 0 ? t.onBrand : t.brand} />
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={[typography.micro, styles.disclaimer, { color: t.ink3 }]}>{advice.data.disclaimer}</Text>
          </LinearGradient>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content:       { gap: 16, paddingBottom: 24 },
  panel:         { padding: 20, borderWidth: StyleSheet.hairlineWidth },
  loadingPanel:  { minHeight: 220, justifyContent: 'center' },
  header:        { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  headerText:    { flex: 1 },
  aiIconBox:     { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  eyebrowRow:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  statusPill:    { borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, paddingVertical: 3 },
  loadingBars:   { flexDirection: 'row', gap: 6, marginTop: 18 },
  loadingBar:    { flex: 1, height: 6, borderRadius: 999, opacity: 0.18 },
  section:       { marginTop: 18, gap: 10 },
  sectionLabel:  { letterSpacing: 0.6, textTransform: 'uppercase' },
  evidenceRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  evidencePill:  { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  actionList:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  actionButton:  { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 9 },
  disclaimer:    { marginTop: 18 },
});
