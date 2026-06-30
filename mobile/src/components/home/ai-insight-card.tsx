import React from 'react';
import { ActivityIndicator, Pressable, View, Text, StyleSheet, type GestureResponderEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconSparkle } from '../../icons';
import { PressableCard } from '../primitives/pressable-card';
import type { DashboardAiAdvice, DashboardAiAdviceActionType, DashboardAiAdviceSource } from '../../../../shared/api-contracts';

interface AiInsightCardProps {
  title?: string;
  body?: string;
  advice?: DashboardAiAdvice | null;
  loading?: boolean;
  error?: boolean;
  onActionPress?: (type: DashboardAiAdviceActionType) => void;
  onPress?: () => void;
  onRetry?: () => void;
}

const SOURCE_LABEL_KEYS: Record<DashboardAiAdviceSource, string> = {
  ai: 'home.aiAdviceSourceAi',
  rule: 'home.aiAdviceSourceRule',
  cache: 'home.aiAdviceSourceCache',
};

export function AiInsightCard({
  title,
  body,
  advice,
  loading = false,
  error = false,
  onActionPress,
  onPress,
  onRetry,
}: AiInsightCardProps) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const isFallback = advice?.status === 'fallback' || advice?.source === 'rule';
  const displayTitle = advice?.title ?? title ?? (error ? i18n('home.aiAdviceUnavailable') : i18n('home.aiInsightTitle'));
  const displayBody = advice?.body ?? body ?? (error ? i18n('home.aiAdviceUnavailableMessage') : i18n('home.noAiInsightMessage'));
  const sourceLabelKey = advice ? (isFallback ? 'home.aiAdviceSourceFallback' : SOURCE_LABEL_KEYS[advice.source]) : null;
  const actions = advice?.actions?.slice(0, 2) ?? [];
  const cardBackground = error ? t.dangerSoft : isFallback ? t.warningSoft : t.brandSoft;
  const cardBorder = error ? t.danger : isFallback ? t.warning : t.borderStrong;
  const handleActionPress = (type: DashboardAiAdviceActionType) => (event?: GestureResponderEvent) => {
    event?.stopPropagation?.();
    onActionPress?.(type);
  };
  const handleRetryPress = (event?: GestureResponderEvent) => {
    event?.stopPropagation?.();
    onRetry?.();
  };
  const content = (
    <View style={[styles.card, { backgroundColor: cardBackground, borderColor: cardBorder, borderRadius: t.radius.xl }]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: t.brand }]}>
          {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <IconSparkle size={18} color="#FFFFFF" />}
        </View>
        <View style={styles.headerText}>
          <View style={styles.eyebrowRow}>
            <Text style={[typography.micro, { color: t.brand }]}>{i18n('home.aiInsight')}</Text>
            {sourceLabelKey ? (
              <View style={[styles.statusPill, { backgroundColor: t.card, borderColor: cardBorder }]}>
                <Text style={[typography.micro, { color: isFallback ? t.warning : t.ink3 }]}>{i18n(sourceLabelKey)}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[typography.bodyMed, { color: t.ink, marginTop: 2 }]}>
            {loading ? i18n('home.aiAdviceLoadingTitle') : displayTitle}
          </Text>
        </View>
      </View>
      <Text style={[typography.caption, { color: t.ink3, marginTop: 4 }]}>
        {loading ? i18n('home.aiAdviceLoadingBody') : displayBody}
      </Text>
      {loading ? (
        <View style={styles.loadingBars} accessibilityLabel={i18n('home.aiAdviceLoadingTitle')}>
          {[0, 1, 2].map((item) => (
            <View key={item} style={[styles.loadingBar, { backgroundColor: t.brand }]} />
          ))}
        </View>
      ) : null}
      {!loading && advice?.evidence?.length ? (
        <View style={styles.evidenceRow}>
          {advice.evidence.slice(0, 3).map((item) => (
            <View key={`${item.metric}-${item.value}`} style={[styles.evidencePill, { backgroundColor: t.card }]}>
              <Text style={[typography.micro, { color: t.ink3 }]}>
                {formatEvidence(item)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {!loading && actions.length && onActionPress ? (
        <View style={styles.actionRow}>
          {actions.map((action, index) => (
            <Pressable
              key={action.id}
              style={[
                styles.actionButton,
                index === 0
                  ? { backgroundColor: t.brand, borderColor: t.brand }
                  : { backgroundColor: t.card, borderColor: t.borderStrong },
              ]}
              onPress={handleActionPress(action.type)}
            >
              <Text style={[typography.micro, { color: index === 0 ? t.onBrand : t.brand }]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {!loading && error && onRetry ? (
        <Pressable style={[styles.actionButton, { backgroundColor: t.card, borderColor: t.borderStrong }]} onPress={handleRetryPress}>
          <Text style={[typography.micro, { color: t.brand }]}>{i18n('common.retry')}</Text>
        </Pressable>
      ) : null}
      {!loading && advice?.disclaimer ? (
        <Text style={[typography.micro, styles.disclaimer, { color: t.ink3 }]}>{advice.disclaimer}</Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return <PressableCard onPress={onPress}>{content}</PressableCard>;
  }
  return content;
}

function formatEvidence(item: DashboardAiAdvice['evidence'][number]) {
  const unit = item.unit ? ` ${item.unit}` : '';
  const comparison = item.comparison ? ` · ${item.comparison}` : '';
  return `${item.metric}: ${item.value ?? '--'}${unit}${comparison}`;
}

const styles = StyleSheet.create({
  card:       { padding: 16, marginVertical: 4, borderWidth: StyleSheet.hairlineWidth },
  header:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBox:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headerText: { flex: 1 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  statusPill: { borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, paddingVertical: 3 },
  loadingBars: { flexDirection: 'row', gap: 6, marginTop: 12 },
  loadingBar: { flex: 1, height: 5, borderRadius: 999, opacity: 0.18 },
  evidenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  evidencePill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionButton: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 8 },
  disclaimer: { marginTop: 12 },
});
