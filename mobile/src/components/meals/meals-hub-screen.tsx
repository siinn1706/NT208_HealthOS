import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../layout/Screen';
import { TopBar } from '../layout/TopBar';
import { SectionHeader } from '../layout/SectionHeader';
import { Card } from '../primitives/Card';
import { IconButton } from '../primitives/IconButton';
import { ProgressRing } from '../charts/ProgressRing';
import { Sparkline } from '../charts/Sparkline';
import { MealRow } from './meal-row';
import { ApiState } from '../api/ApiState';
import { useTheme } from '../../theme/useTheme';
import { typography, tabularNums } from '../../theme/typography';
import { useApiQuery } from '../../api/query';
import { mealService, nutritionService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import {
  IconCalendar, IconPlus, IconSparkle,
  IconCoffee, IconUtensils, IconCookie,
} from '../../icons';

const DAILY_TARGET_KCAL = 2100;

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function slotOf(loggedAt: string) {
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

  const today = useMemo(() => new Date(), []);
  const todayIso = isoDate(today);
  const weekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return isoDate(d);
  }, []);

  const loadMeals = useCallback(
    () => mealService.list({ page: 1, per_page: 100, date_from: todayIso, date_to: todayIso }),
    [todayIso],
  );
  const loadWeekCalories = useCallback(
    () => mealService.caloriesSummary(weekStart, todayIso),
    [todayIso, weekStart],
  );
  const loadSuggestions = useCallback(() => nutritionService.suggestions(), []);

  const meals = useApiQuery(queryKeys.meals(todayIso), loadMeals);
  const calories = useApiQuery(queryKeys.mealCaloriesSummary(`${weekStart}:${todayIso}`), loadWeekCalories);
  const suggestions = useApiQuery(queryKeys.nutritionSuggestions, loadSuggestions);

  const mealRows = useMemo(() => {
    return (meals.data ?? [])
      .slice()
      .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
      .map((meal) => {
        const slot = slotOf(meal.logged_at);
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
      };
    });
  }, [calories.data, todayIso]);

  const weekKcal = useMemo(() => weekSeries.map((row) => row.kcal), [weekSeries]);
  const avgWeek = useMemo(() => {
    if (!weekKcal.length) return 0;
    const total = weekKcal.reduce((sum, value) => sum + value, 0);
    return Math.round(total / weekKcal.length);
  }, [weekKcal]);

  const coachCopy = suggestions.data?.[0]?.message ?? 'Log your meals to unlock personalized nutrition suggestions.';
  const kcalLeft = Math.max(0, Math.round(DAILY_TARGET_KCAL - todayTotals.kcal));

  return (
    <Screen>
      <TopBar
        title="Meals"
        subtitle={today.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        right={
          <View style={styles.topActions}>
            <IconButton icon={<IconCalendar size={20} color={t.ink3} />} variant="subtle" accessibilityLabel="Calendar" />
            {/* Filled circle plus button */}
            <Pressable
              onPress={() => router.push('/meals/add' as never)}
              style={[styles.plusCircle, { backgroundColor: t.brand }]}
              accessibilityLabel="Add meal"
            >
              <IconPlus size={18} color="#fff" />
            </Pressable>
          </View>
        }
      />

      {(meals.isLoading || calories.isLoading) && <ApiState title="Loading meals" loading />}
      {(meals.error || calories.error) && (
        <ApiState
          title="Meals unavailable"
          message={meals.error?.message ?? calories.error?.message}
          actionLabel="Retry"
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
                style={[styles.dayPill, { backgroundColor: d.today ? t.brand : t.card, borderColor: t.border }]}
              >
                <Text style={[typography.micro, { color: d.today ? '#fff' : t.ink3 }]}>{d.day}</Text>
                <Text style={[typography.h3, tabularNums, { color: d.today ? '#fff' : t.ink }]}>{d.date}</Text>
                <Text style={[typography.micro, { color: d.today ? 'rgba(255,255,255,0.75)' : t.ink3 }]}>
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
                <Text style={[typography.micro, { color: 'rgba(255,255,255,0.7)' }]}>LEFT</Text>
              </View>
            </ProgressRing>
            <View style={styles.heroText}>
              <Text style={[typography.micro, { color: 'rgba(255,255,255,0.6)', letterSpacing: 1 }]}>CALORIES TODAY</Text>
              <Text style={[typography.h3, tabularNums, { color: '#fff' }]}>{Math.round(todayTotals.kcal)} / {DAILY_TARGET_KCAL} kcal</Text>
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.75)' }]}>{mealRows.length} meals logged</Text>
            </View>
          </View>

          <View style={styles.macroGrid}>
            {[
              { label: 'Carbs',   consumed: todayTotals.carbs,   target: 240, color: '#E3B79A' },
              { label: 'Protein', consumed: todayTotals.protein, target: 120, color: t.brand   },
              { label: 'Fat',     consumed: todayTotals.fat,     target: 65,  color: '#5B90C4' },
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

          <SectionHeader title="Today's meals" action="See all" onActionPress={() => router.push('/meals/trends' as never)} />
          {mealRows.length === 0 ? (
            <ApiState title="No meals logged yet" message="Add your first meal to see daily nutrition progress." />
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
                <Text style={[typography.caption, { color: t.ink3, marginLeft: 6 }]}>Add meal</Text>
              </Pressable>
            </View>
          )}

          <SectionHeader title="This week" action="Trends" onActionPress={() => router.push('/meals/trends' as never)} />
          <Card tight>
            <View style={styles.weekRow}>
              <View>
                <Text style={[typography.micro, { color: t.ink3 }]}>AVG DAILY</Text>
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
  plusCircle:      { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
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
