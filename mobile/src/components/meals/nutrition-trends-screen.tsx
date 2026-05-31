import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../layout/screen';
import { TopBar } from '../layout/top-bar';
import { Card } from '../primitives/card';
import { Button } from '../primitives/button';
import { IconButton } from '../primitives/icon-button';
import { ApiState } from '../api/api-state';
import { MacroDonut } from './macro-donut';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { mealService, reportService } from '../../api/services';
import { ChevronLeft, IconCalendar } from '../../icons';
import type { Meal } from '../../../../shared/api-contracts';

type Period = '7d' | '30d' | '90d';

const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90 };

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rangeFor(period: Period) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (PERIOD_DAYS[period] - 1));
  return { start: toDateInput(start), end: toDateInput(end) };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function mealName(meal: Meal) {
  return meal.nutrition_result?.dish_name || meal.name || 'Meal';
}

export function NutritionTrendsScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [period, setPeriod] = useState<Period>('7d');
  const [feedback, setFeedback] = useState<string | null>(null);
  const range = useMemo(() => rangeFor(period), [period]);
  const rangeKey = `${period}.${range.start}.${range.end}`;

  const loadSummary = useCallback(() => mealService.caloriesSummary(range.start, range.end), [range.end, range.start]);
  const loadMeals = useCallback(
    () => mealService.list({ page: 1, per_page: 100, date_from: range.start, date_to: range.end }),
    [range.end, range.start],
  );
  const loadTrend = useCallback(() => reportService.trends('calories', period), [period]);
  const summary = useApiQuery(queryKeys.mealCaloriesSummary(rangeKey), loadSummary);
  const meals = useApiQuery(queryKeys.meals(`trends.${rangeKey}`), loadMeals);
  const trend = useApiQuery(queryKeys.reportTrend('calories', period), loadTrend);
  const reloadSummary = summary.reload;
  const reloadMeals = meals.reload;
  const reloadTrend = trend.reload;

  const mealRows = meals.data ?? [];
  const calorieRows = summary.data ?? [];
  const isLoading = summary.isLoading || meals.isLoading || trend.isLoading;
  const error = summary.error ?? meals.error ?? trend.error;
  const total = calorieRows.reduce((sum, row) => sum + row.total_calories, 0);
  const avg = calorieRows.length ? Math.round(total / calorieRows.length) : 0;
  const peak = calorieRows.reduce((max, row) => Math.max(max, row.total_calories), 0);
  const macro = mealRows.reduce<{ carbs: number; protein: number; fat: number }>((acc, meal) => {
    acc.carbs += meal.nutrition_result?.carbs_g ?? 0;
    acc.protein += meal.nutrition_result?.protein_g ?? 0;
    acc.fat += meal.nutrition_result?.fat_g ?? 0;
    return acc;
  }, { carbs: 0, protein: 0, fat: 0 });
  const trendPayload = asRecord(trend.data);
  const trendLabel = asString(trendPayload.trend, calorieRows.length > 1 ? 'stable' : 'not enough data');
  const trendChange = typeof trendPayload.change_percent === 'number' && Number.isFinite(trendPayload.change_percent)
    ? trendPayload.change_percent
    : null;
  const topMeals = [...mealRows]
    .sort((a, b) => (b.nutrition_result?.calories ?? 0) - (a.nutrition_result?.calories ?? 0))
    .slice(0, 3);

  const reload = useCallback(() => {
    void reloadSummary();
    void reloadMeals();
    void reloadTrend();
  }, [reloadMeals, reloadSummary, reloadTrend]);

  return (
    <Screen>
      <TopBar
        title={i18n('meals.nutritionTrends')}
        subtitle={`${range.start} - ${range.end}`}
        left={<IconButton icon={<ChevronLeft size={22} color={t.ink} />} onPress={() => router.back()} accessibilityLabel={i18n('common.back')} />}
        right={<IconButton icon={<IconCalendar size={20} color={t.ink3} />} onPress={() => setFeedback('Custom date ranges need a Core-backed date picker flow. Use the period controls for now.')} accessibilityLabel="Change range" />}
      />

      <View style={styles.periods}>
        {(['7d', '30d', '90d'] as Period[]).map((item) => (
          <Pressable
            key={item}
            onPress={() => setPeriod(item)}
            style={[styles.periodBtn, { backgroundColor: item === period ? t.brand : t.card, borderColor: item === period ? t.brand : t.border, borderRadius: t.radius.pill }]}
          >
            <Text style={[typography.chip, { color: item === period ? '#fff' : t.ink3 }]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      {feedback && <ApiState title="Date range unavailable" message={feedback} actionLabel={i18n('common.close')} onAction={() => setFeedback(null)} />}
      {isLoading && <ApiState title={i18n('meals.loadingMeals')} loading />}
      {error && <ApiState title={i18n('meals.mealsUnavailable')} message={error.message} actionLabel={i18n('common.retry')} onAction={reload} />}
      {!isLoading && !error && calorieRows.length === 0 && (
        <ApiState title={i18n('meals.noMealsLogged')} message={i18n('meals.addFirstMeal')} actionLabel={i18n('meals.addMeal')} onAction={() => router.push('/meals/add' as never)} />
      )}

      {!isLoading && !error && calorieRows.length > 0 && (
        <>
          <View style={styles.stats}>
            <StatCard label={i18n('meals.avgDaily')} value={`${avg} ${i18n('common.kcal')}`} />
            <StatCard label={i18n('meals.calories')} value={`${Math.round(total)} ${i18n('common.kcal')}`} />
            <StatCard label="Peak day" value={`${Math.round(peak)} ${i18n('common.kcal')}`} />
          </View>

          <Card style={styles.splitCard}>
            <MacroDonut
              segments={[
                { value: macro.carbs, color: '#E3B79A' },
                { value: macro.protein, color: t.brand },
                { value: macro.fat, color: '#5B90C4' },
              ]}
              size={118}
            >
              <Text style={[typography.h3, { color: t.ink }]}>{Math.round(total)}</Text>
              <Text style={[typography.micro, { color: t.ink3 }]}>{i18n('common.kcal')}</Text>
            </MacroDonut>
            <View style={styles.splitText}>
              <Text style={[typography.h3, { color: t.ink }]}>Core calorie trend: {trendLabel}</Text>
              <Text style={[typography.body, { color: t.ink3 }]}>
                {trendChange !== null ? `${Math.round(trendChange)}% change from Core reports` : 'Core reports did not return a percentage change yet.'}
              </Text>
              <Text style={[typography.caption, { color: t.ink4 }]}>Meals analyzed: {mealRows.length}</Text>
            </View>
          </Card>

          <Card style={styles.list}>
            {topMeals.length === 0 ? (
              <Text style={[typography.body, { color: t.ink3 }]}>No analyzed meals returned for this period.</Text>
            ) : topMeals.map((meal) => (
              <Pressable key={meal.id} onPress={() => router.push(`/meals/${meal.id}` as never)} style={[styles.row, { borderBottomColor: t.border }]}>
                <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>{mealName(meal)}</Text>
                <Text style={[typography.bodyMed, { color: t.brand }]}>{Math.round(meal.nutrition_result?.calories ?? 0)} {i18n('common.kcal')}</Text>
              </Pressable>
            ))}
          </Card>
          <Button label={i18n('common.retry')} variant="ghost" onPress={reload} />
        </>
      )}
    </Screen>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <Card style={styles.stat}>
      <Text style={[typography.micro, { color: t.ink3 }]}>{label}</Text>
      <Text style={[typography.h3, { color: t.ink }]}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  periods: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  periodBtn: { borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 8 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, gap: 4 },
  splitCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  splitText: { flex: 1, gap: 6 },
  list: { gap: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
