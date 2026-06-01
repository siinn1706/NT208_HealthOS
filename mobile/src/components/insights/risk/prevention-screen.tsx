// Prevention plan screen backed by Core risk-prediction tips.
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../layout/screen';
import { ApiState } from '../../api/api-state';
import { useApiQuery } from '../../../api/query';
import { queryKeys } from '../../../api/queryKeys';
import { planService, riskService } from '../../../api/services';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { ChevronLeft } from '../../../icons';
import {
  riskTipsToActions,
  type PreventionAction,
  type PreventionCategory,
} from './prevention-action-derivation';
import {
  PREVENTION_PLAN_CATEGORY,
  PREVENTION_PLAN_DESCRIPTION,
  PREVENTION_PLAN_TITLE,
  actionToPreventionPlanItem,
  hasTrackedPreventionAction,
  mergePreventionPlanItem,
} from './prevention-plan-items';
import { PreventionSuggestionCard } from './prevention-suggestion-card';

function BackBar({ title }: { title: string }) {
  const t = useTheme();
  return (
    <View style={styles.backBar}>
      <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
        <ChevronLeft size={24} color={t.ink} />
      </Pressable>
      <Text style={[typography.h3, { flex: 1, color: t.ink }]} numberOfLines={1}>{title}</Text>
    </View>
  );
}

export function PreventionScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<PreventionCategory | 'All'>('All');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [savingActionId, setSavingActionId] = useState<string | null>(null);
  const savingRef = useRef(false);
  const loadRisk = useCallback(() => riskService.summary(), []);
  const risk = useApiQuery(queryKeys.riskSummary, loadRisk);
  const loadPreventionPlan = useCallback(() => planService.findActiveByCategory(PREVENTION_PLAN_CATEGORY), []);
  const plan = useApiQuery(queryKeys.preventionPlans, loadPreventionPlan);

  const actions = useMemo(() => riskTipsToActions(risk.data), [risk.data]);
  const preventionPlan = plan.data;
  const categories = useMemo<(PreventionCategory | 'All')[]>(() => {
    const seen = new Set<PreventionCategory>();
    actions.forEach((action) => seen.add(action.category));
    return ['All', ...Array.from(seen)];
  }, [actions]);
  const filtered = activeCategory === 'All'
    ? actions
    : actions.filter((action) => action.category === activeCategory);

  async function trackAction(item: PreventionAction) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSavingActionId(item.id);
    setFeedback(null);
    try {
      const latestPlan = await planService.findActiveByCategory(PREVENTION_PLAN_CATEGORY);
      const nextItem = actionToPreventionPlanItem(item);
      const nextItems = mergePreventionPlanItem(latestPlan?.items, nextItem);
      if (latestPlan) {
        await planService.update(latestPlan.id, {
          title: PREVENTION_PLAN_TITLE,
          category: PREVENTION_PLAN_CATEGORY,
          description: PREVENTION_PLAN_DESCRIPTION,
          items: nextItems,
        });
      } else {
        await planService.create({
          title: PREVENTION_PLAN_TITLE,
          category: PREVENTION_PLAN_CATEGORY,
          description: PREVENTION_PLAN_DESCRIPTION,
          items: nextItems,
        });
      }
      await plan.reload();
      setFeedback(`${item.title} saved to your prevention plan.`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Could not save this prevention action.');
    } finally {
      setSavingActionId(null);
      savingRef.current = false;
    }
  }

  return (
    <Screen>
      <BackBar title={i18n('insights.preventionTitle')} />

      {risk.isLoading && <ApiState title={i18n('api.loading')} loading />}
      {risk.error && (
        <ApiState
          title="Prevention plan unavailable"
          message={risk.error.message}
          actionLabel={i18n('common.retry')}
          onAction={risk.reload}
        />
      )}
      {feedback && (
        <ApiState
          title="Prevention plan"
          message={feedback}
          actionLabel={i18n('common.close')}
          onAction={() => setFeedback(null)}
        />
      )}
      {plan.error && (
        <ApiState
          title="Saved prevention plan unavailable"
          message={plan.error.message}
          actionLabel={i18n('common.retry')}
          onAction={plan.reload}
        />
      )}

      {!risk.isLoading && !risk.error && actions.length === 0 && (
        <ApiState title="No prevention actions" message="Core risk predictions did not return prevention tips yet." />
      )}

      {!risk.isLoading && !risk.error && actions.length > 0 && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={filterStyles.bar}>
            {categories.map((cat) => {
              const active = activeCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setActiveCategory(cat)}
                  style={[
                    filterStyles.chip,
                    {
                      backgroundColor: active ? t.brand : t.card,
                      borderColor: active ? t.brand : t.border,
                      borderRadius: t.radius.pill,
                    },
                  ]}
                >
                  <Text style={[typography.chip, { color: active ? '#fff' : t.ink3 }]}>{cat}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.cardList}>
            {filtered.map((item) => (
              <PreventionSuggestionCard
                key={item.id}
                item={item}
                tracked={hasTrackedPreventionAction(preventionPlan, item.id)}
                saving={savingActionId === item.id}
                disabled={savingActionId !== null}
                onTrack={() => { void trackAction(item); }}
              />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, minHeight: 52 },
  backBtn:   { width: 40, alignItems: 'flex-start' },
  cardList:  { gap: 12 },
});

const filterStyles = StyleSheet.create({
  bar:  { flexDirection: 'row', gap: 8, paddingBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth },
});
