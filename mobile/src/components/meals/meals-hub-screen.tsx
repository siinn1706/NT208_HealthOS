import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../layout/screen';
import { TopBar } from '../layout/top-bar';
import { SectionHeader } from '../layout/section-header';
import { Card } from '../primitives/card';
import { IconButton } from '../primitives/icon-button';
import { ProgressRing } from '../charts/progress-ring';
import { Sparkline } from '../charts/sparkline';
import { MealRow } from './meal-row';
import { ApiState } from '../api/api-state';
import { useTheme } from '../../theme/useTheme';
import { typography, tabularNums } from '../../theme/typography';
import { useApiQuery } from '../../api/query';
import { mealService, nutritionService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import {
  IconCalendar, IconPlus, IconSparkle,
  IconCoffee, IconUtensils, IconCookie,
} from '../../icons';
import { toLocalDateInput } from './meal-date';

const DAILY_TARGET_KCAL = 2100;

function isoDate(date: Date) {
  return toLocalDateInput(date);
}

const MEAL_TYPE_SLOTS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
} as const;

function normalizeMealTypeSlot(value: string | null | undefined) {
  const key = value?.trim().toLowerCase();
  if (!key) return null;
  return MEAL_TYPE_SLOTS[key as keyof typeof MEAL_TYPE_SLOTS] ?? null;
}

export function slotOf(loggedAt: string, mealType?: string | null) {
  const explicitSlot = normalizeMealTypeSlot(mealType);
  if (explicitSlot) return explicitSlot;

  const hour = new Date(loggedAt).getHours();
  if (hour < 10) return 'Breakfast';
  if (hour < 14) return 'Lunch';
  if (hour < 17) return 'Snack';
  return 'Dinner';
}

function slotIcon(slot: string) {
  if (slot === 'Breakfast') return <IconCoffee size={22} color="#fff" />;
  if (slot === 'Lunch' || slot === 'Dinner') return <IconUtensils size={22} color="#fff" />;
  return <IconCookie size={22} color="#fff" />;
}

function fmtTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function MealsHubScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();

  const today = useMemo(() => new Date(), []);
  const todayIso = isoDate(today);
  const [selectedDateIso, setSelectedDateIso] = useState(todayIso);
  const selectedDate = useMemo(() => new Date(`${selectedDateIso}T00:00:00`), [selectedDateIso]);
  const selectedIsToday = selectedDateIso === todayIso;
  const weekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return isoDate(d);
  }, []);

  const loadMeals = useCallback(
    () => mealService.list({ page: 1, per_page: 100, date_from: selectedDateIso, date_to: selectedDateIso }),
    [selectedDateIso],
  );
  const loadWeekCalories = useCallback(
    () => mealService.caloriesSummary(weekStart, todayIso),
    [todayIso, weekStart],
  );
  const loadSuggestions = useCallback(() => nutritionService.suggestions(), []);

  const meals = useApiQuery(queryKeys.meals(selectedDateIso), loadMeals);
  const calories = useApiQuery(queryKeys.mealCaloriesSummary(`${weekStart}:${todayIso}`), loadWeekCalories);
  const suggestions = useApiQuery(queryKeys.nutritionSuggestions, loadSuggestions);

  const mealRows = useMemo(() => {
    return (meals.data ?? [])
      .slice()
      .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
      .map((meal) => {
        const slot = slotOf(
          meal.logged_at,
          meal.nutrition_result?.meal_type ?? meal.nutrition_result?.serving_type,
        );
        const kcal = meal.nutrition_result?.calories ?? 0;
        const carbs = Math.round(meal.nutrition_result?.carbs_g ?? 0);
        const protein = Math.round(meal.nutrition_result?.protein_g ?? 0);
        return {
          id: meal.id,
          slot,
          time: fmtTime(meal.logged_at),
          title: meal.name,
          meta: `${Math.round(kcal)} kcal · ${carbs}g C · ${protein}g P`,
          kcal: Math.round(kcal),
          aiScanned: Boolean(meal.image_url),
        };
      });
  }, [meals.data]);

  const todayTotals = useMemo(() => {
    return (meals.data ?? []).reduce(
      (acc, meal) => {
        acc.kcal += meal.nutrition_result?.calories ?? 0;
        acc.carbs += meal.nutrition_result?.carbs_g ?? 0;
        acc.protein += meal.nutrition_result?.protein_g ?? 0;
        acc.fat += meal.nutrition_result?.fat_g ?? 0;
        return acc;
      },
      { kcal: 0, carbs: 0, protein: 0, fat: 0 },
    );
  }, [meals.data]);

  const weekSeries = useMemo(() => {
    const points = new Map((calories.data ?? []).map((row) => [row.date, row.total_calories]));
    return Array.from({ length: 7 }, (_, offset) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - offset));
      const dayKey = isoDate(d);
      const total = points.get(dayKey) ?? 0;
      return {
        key: dayKey,
        day: d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3),
        date: d.getDate(),
        kcal: Math.round(total),
        today: dayKey === todayIso,
        selected: dayKey === selectedDateIso,
      };
    });
  }, [calories.data, selectedDateIso, todayIso]);

  const weekKcal = useMemo(() => weekSeries.map((row) => row.kcal), [weekSeries]);
  const avgWeek = useMemo(() => {
    if (!weekKcal.length) return 0;
    const total = weekKcal.reduce((sum, value) => sum + value, 0);
    return Math.round(total / weekKcal.length);
  }, [weekKcal]);

  const coachCopy = suggestions.data?.[0]?.message ?? 'Log your meals to unlock personalized nutrition suggestions.';
  const kcalLeft = Math.max(0, Math.round(DAILY_TARGET_KCAL - todayTotals.kcal));
  const caloriesLabel = selectedIsToday ? i18n('meals.caloriesToday') : i18n('meals.caloriesSelectedDay');
  const mealSectionTitle = selectedIsToday ? i18n('meals.todaysMeals') : i18n('meals.selectedDayMeals');

  return (
    <Screen>
      <TopBar
        title={i18n('meals.title')}
        subtitle={selectedDate.toLocaleDateString('vi-VN', { weekday: 'short', month: 'short', day: 'numeric' })}
        right={
          <View style={styles.topActions}>
            <IconButton
              icon={<IconCalendar size={20} color={t.ink3} />}
              variant="subtle"
              accessibilityLabel={i18n('common.calendar')}
              onPress={() => setSelectedDateIso(todayIso)}
            />
            {/* Filled circle plus button */}
            <Pressable
              onPress={() => router.push('/meals/add' as never)}
              style={[styles.plusCircle, { backgroundColor: t.brand }]}
              accessibilityLabel={i18n('meals.addMeal')}
            >
              <IconPlus size={18} color="#fff" />
            </Pressable>
          </View>
        }
      />

      {(meals.isLoading || calories.isLoading) && <ApiState title={i18n('meals.loadingMeals')} loading />}
      {(meals.error || calories.error) && (
        <ApiState
          title={i18n('meals.mealsUnavailable')}
          message={meals.error?.message ?? calories.error?.message}
          actionLabel={i18n('common.retry')}
          onAction={() => {
            meals.reload();
            calories.reload();
          }}
        />
      )}

      {!meals.isLoading && !calories.isLoading && !meals.error && !calories.error && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayStrip} contentContainerStyle={styles.dayStripContent}>
            {weekSeries.map((d) => (
              <Pressable
                key={d.key}
                accessibilityRole="button"
                accessibilityLabel={`Select meal date ${d.key}`}
                onPress={() => setSelectedDateIso(d.key)}
                style={[styles.dayPill, { backgroundColor: d.selected ? t.brand : d.today ? t.brandSoft : t.card, borderColor: d.selected ? t.brand : t.border }]}
              >
                <Text style={[typography.micro, { color: d.selected ? '#fff' : t.ink3 }]}>{d.day}</Text>
                <Text style={[typography.h3, tabularNums, { color: d.selected ? '#fff' : t.ink }]}>{d.date}</Text>
                <Text style={[typography.micro, { color: d.selected ? 'rgba(255,255,255,0.75)' : t.ink3 }]}>
                  {d.kcal > 0 ? d.kcal : '--'}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Calories hero with decorative circle overlay */}
          <View style={[styles.heroCard, { backgroundColor: t.brand, borderRadius: t.radius.xl, overflow: 'hidden' }]}>
            {/* Decorative translucent circle — clipped inside hero */}
            <View
              style={[styles.heroCircle, { backgroundColor: 'rgba(255,255,255,0.10)' }]}
              pointerEvents="none"
            />
            <ProgressRing value={Math.min(todayTotals.kcal / DAILY_TARGET_KCAL, 1)} size={84} stroke={8} color="#fff" track="rgba(255,255,255,0.22)">
              <View style={styles.ringCenter}>
                <Text style={[typography.title, tabularNums, { color: '#fff' }]}>{kcalLeft}</Text>
                <Text style={[typography.micro, { color: 'rgba(255,255,255,0.7)' }]}>{i18n('meals.left')}</Text>
              </View>
            </ProgressRing>
            <View style={styles.heroText}>
              <Text style={[typography.micro, { color: 'rgba(255,255,255,0.6)', letterSpacing: 1 }]}>{caloriesLabel}</Text>
              <Text style={[typography.h3, tabularNums, { color: '#fff' }]}>{Math.round(todayTotals.kcal)} / {DAILY_TARGET_KCAL} kcal</Text>
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.75)' }]}>{i18n('meals.mealsLogged', { count: mealRows.length })}</Text>
            </View>
          </View>

          <View style={styles.macroGrid}>
            {[
              { label: i18n('meals.carbs'),   consumed: todayTotals.carbs,   target: 240, color: '#E3B79A' },
              { label: i18n('meals.protein'), consumed: todayTotals.protein, target: 120, color: t.brand   },
              { label: i18n('meals.fat'),     consumed: todayTotals.fat,     target: 65,  color: '#5B90C4' },
            ].map((m) => {
              const pct = Math.min(m.consumed / m.target, 1);
              return (
                <Card tight key={m.label} style={[styles.macroCard, { borderWidth: 1, borderColor: t.border }]}>
                  <Text style={[typography.micro, { color: t.ink3, marginBottom: 4 }]}>{m.label}</Text>
                  <Text style={[typography.bodyMed, tabularNums, { color: t.ink }]}>
                    {Math.round(m.consumed)}
                    <Text style={[typography.caption, { color: t.ink3 }]}>/{m.target}g</Text>
                  </Text>
                  <View style={[styles.macroTrack, { backgroundColor: t.border }]}>
                    <View style={[styles.macroFill, { width: `${pct * 100}%`, backgroundColor: m.color }]} />
                  </View>
                </Card>
              );
            })}
          </View>

          {/* Coach card — icon tile + uppercase COACH label */}
          <Card tight style={[styles.coachCard, { backgroundColor: t.brandSoft, borderWidth: 1, borderColor: t.border }]}>
            <View style={styles.coachRow}>
              <View style={[styles.coachIcon, { backgroundColor: `${t.brand}18`, borderRadius: t.radius.md }]}>
                <IconSparkle size={18} color={t.brand} />
              </View>
              <View style={styles.flex}>
                <Text style={[typography.micro, { color: t.brand, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }]}>
                  COACH
                </Text>
                <Text style={[typography.caption, { color: t.ink2, lineHeight: 18 }]}>{coachCopy}</Text>
              </View>
            </View>
          </Card>

          <SectionHeader title={mealSectionTitle} action={i18n('common.seeAll')} onActionPress={() => router.push('/meals/trends' as never)} />
          {mealRows.length === 0 ? (
            <ApiState title={i18n('meals.noMealsLogged')} message={i18n('meals.addFirstMeal')} />
          ) : (
            <View style={styles.mealList}>
              {mealRows.map((m) => (
                <MealRow
                  key={m.id}
                  slotLabel={m.slot}
                  time={m.time}
                  title={m.title}
                  meta={m.meta}
                  kcal={m.kcal}
                  aiScanned={m.aiScanned}
                  icon={<View style={[styles.slotIconBg, { backgroundColor: t.brand }]}>{slotIcon(m.slot)}</View>}
                  onPress={() => router.push(`/meals/${m.id}` as never)}
                />
              ))}
              <Pressable onPress={() => router.push('/meals/add' as never)} style={[styles.addMealRow, { borderColor: t.border, borderRadius: t.radius.lg }]}>
                <IconPlus size={16} color={t.ink3} />
                <Text style={[typography.caption, { color: t.ink3, marginLeft: 6 }]}>{i18n('meals.addMeal')}</Text>
              </Pressable>
            </View>
          )}

          <SectionHeader title={i18n('meals.thisWeek')} action={i18n('meals.trends')} onActionPress={() => router.push('/meals/trends' as never)} />
          <Card tight>
            <View style={styles.weekRow}>
              <View>
                <Text style={[typography.micro, { color: t.ink3 }]}>{i18n('meals.avgDaily')}</Text>
                <Text style={[typography.title, tabularNums, { color: t.ink }]}>{avgWeek} kcal</Text>
              </View>
              <Sparkline data={weekKcal} color={t.brand} width={140} height={44} fill />
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topActions:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  plusCircle:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dayStrip:        { marginHorizontal: -16, marginBottom: 12 },
  dayStripContent: { paddingHorizontal: 16, gap: 8 },
  dayPill:         { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, minWidth: 54 },
  heroCard:        { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16, marginBottom: 12, position: 'relative' },
  heroCircle:      { position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80 },
  ringCenter:      { alignItems: 'center' },
  heroText:        { flex: 1, gap: 2 },
  macroGrid:       { flexDirection: 'row', gap: 8, marginBottom: 12 },
  macroCard:       { flex: 1 },
  macroTrack:      { height: 4, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  macroFill:       { height: 4, borderRadius: 2 },
  coachCard:       { marginBottom: 4 },
  coachRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  coachIcon:       { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  flex:            { flex: 1 },
  mealList:        { gap: 8 },
  slotIconBg:      { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  addMealRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderWidth: StyleSheet.hairlineWidth },
  weekRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
