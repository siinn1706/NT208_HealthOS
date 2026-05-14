import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../layout/Screen';
import { Card } from '../primitives/Card';
import { Button } from '../primitives/Button';
import { ProgressRing } from '../charts/ProgressRing';
import { ApiState } from '../api/ApiState';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { mealService } from '../../api/services';
import { useTheme } from '../../theme/useTheme';
import { typography, tabularNums } from '../../theme/typography';
import { IngredientRow } from './ingredient-row';
import { ChevronLeft, IconRefresh, IconMore, IconHeartPulse } from '../../icons';

const DAILY_TARGET_KCAL = 2100;

function BackBar({ onBack, right }: { onBack: () => void; right?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.backBar}>
      <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
        <ChevronLeft size={24} color={t.ink} />
      </Pressable>
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}

function slotLabel(loggedAt: string) {
  const hour = new Date(loggedAt).getHours();
  if (hour < 10) return 'BREAKFAST';
  if (hour < 14) return 'LUNCH';
  if (hour < 17) return 'SNACK';
  return 'DINNER';
}

export function MealDetailScreen() {
  const router = useRouter();
  const t = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const mealId = Array.isArray(params.id) ? params.id[0] : params.id;

  const loadDetail = useCallback(() => mealService.detail(mealId ?? ''), [mealId]);
  const meal = useApiQuery(queryKeys.meal(mealId ?? 'missing'), loadDetail, { enabled: Boolean(mealId) });
  const loadIngredients = useCallback(() => mealService.ingredients(mealId ?? ''), [mealId]);
  const ingredients = useApiQuery(queryKeys.mealIngredients(mealId ?? 'missing'), loadIngredients, { enabled: Boolean(mealId) });
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const model = useMemo(() => {
    if (!meal.data) return null;
    const nutrition = meal.data.nutrition_result;
    const calories = Math.round(nutrition?.calories ?? 0);
    const carbs = Math.round(nutrition?.carbs_g ?? 0);
    const protein = Math.round(nutrition?.protein_g ?? 0);
    const fat = Math.round(nutrition?.fat_g ?? 0);
    const saltG = nutrition?.salt_g ?? 0;
    const sugarG = nutrition?.sugar_g ?? 0;
    const satG = nutrition?.saturates_g ?? 0;
    return {
      title: meal.data.name,
      loggedAt: new Date(meal.data.logged_at),
      imageUrl: meal.data.image_url,
      status: meal.data.status,
      calories,
      carbs,
      protein,
      fat,
      micronutrients: [
        { label: 'Salt',    value: saltG,  unit: 'g', max: 6,  warn: saltG > 5 },
        { label: 'Sugar',   value: sugarG, unit: 'g', max: 50, warn: sugarG > 40 },
        { label: 'Sat fat', value: satG,   unit: 'g', max: 20, warn: satG > 16 },
      ],
    };
  }, [meal.data]);

  useEffect(() => {
    setDraftName(model?.title ?? '');
  }, [model?.title]);

  async function handleSaveEdit() {
    if (!mealId || savingEdit) return;
    const nextName = draftName.trim();
    if (!nextName) {
      setEditError('Meal name is required.');
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      await mealService.update(mealId, { name: nextName });
      invalidateApiQuery(queryKeys.meal(mealId));
      invalidateApiQuery(queryKeys.mealIngredients(mealId));
      await Promise.all([meal.reload(), ingredients.reload()]);
      setIsEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not update meal.');
    } finally {
      setSavingEdit(false);
    }
  }

  if (!mealId) {
    return (
      <Screen>
        <ApiState title="Meal not found" message="Missing meal id in route." actionLabel="Back" onAction={() => router.back()} />
      </Screen>
    );
  }

  if (meal.isLoading) {
    return (
      <Screen>
        <ApiState title="Loading meal" loading />
      </Screen>
    );
  }

  if (meal.error) {
    return (
      <Screen>
        <ApiState title="Meal unavailable" message={meal.error.message} actionLabel="Retry" onAction={meal.reload} />
      </Screen>
    );
  }

  if (!model) {
    return (
      <Screen>
        <ApiState title="Meal not found" message="Backend returned empty meal payload." actionLabel="Back" onAction={() => router.back()} />
      </Screen>
    );
  }

  const consumedPct = Math.min(model.calories / DAILY_TARGET_KCAL, 1);
  const loggedLabel = model.loggedAt.toLocaleString();

  // Status subtitle — no raw status exposed
  function statusSubtitle(status: string) {
    if (status === 'ready') return 'AI scan · nutrition verified';
    if (status === 'pending') return 'Nutrition pending';
    return 'Manual entry';
  }

  return (
    <Screen>
      <BackBar
        onBack={() => router.back()}
        right={
          <View style={styles.topActions}>
            <Pressable hitSlop={8} onPress={meal.reload}><IconRefresh size={20} color={t.ink3} /></Pressable>
            <Pressable hitSlop={8} style={{ marginLeft: 8 }}><IconMore size={20} color={t.ink3} /></Pressable>
          </View>
        }
      />

      {/* Hero photo — consistent borderRadius via style, no double-application */}
      <View style={[styles.heroPhoto, { backgroundColor: t.card, borderRadius: t.radius.lg, borderColor: t.border }]}>
        {model.imageUrl ? (
          <Image source={{ uri: model.imageUrl }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <>
            <View style={[styles.blob, { backgroundColor: '#5C3D20', top: 24, left: 36, width: 120, height: 90 }]} />
            <View style={[styles.blob, { backgroundColor: '#3B5E3A', top: 60, right: 44, width: 90, height: 70 }]} />
            <View style={[styles.blob, { backgroundColor: '#7A4A1E', bottom: 28, left: 70, width: 100, height: 72 }]} />
          </>
        )}
        <View style={[styles.aiChip, { backgroundColor: t.brand }]}>
          <Text style={[typography.micro, { color: '#fff' }]}>{model.imageUrl ? 'AI scan' : 'No photo'}</Text>
        </View>
      </View>

      {/* Title block */}
      <View style={styles.titleBlock}>
        <Text style={[typography.micro, { color: t.ink3, letterSpacing: 1 }]}>
          {slotLabel(model.loggedAt.toISOString())} · {loggedLabel}
        </Text>
        <Text style={[typography.title, { color: t.ink, marginTop: 4 }]}>{model.title}</Text>
        {/* Clean status subtitle — no raw status string */}
        <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>
          {statusSubtitle(model.status)}
        </Text>
      </View>

      {/* Macros card — "Of daily target" + percent in brand */}
      <Card tight style={styles.macrosCard}>
        <View style={styles.macrosRow}>
          <ProgressRing value={consumedPct} size={72} stroke={7} color={t.brand} track={t.border}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[typography.micro, { color: t.ink3 }]}>Of daily</Text>
              <Text style={[typography.micro, { color: t.ink3 }]}>target</Text>
              <Text style={[typography.chip, tabularNums, { color: t.brand }]}>{Math.round(consumedPct * 100)}%</Text>
            </View>
          </ProgressRing>
          <View style={styles.macrosBars}>
            {/* On-track chip */}
            <View style={[styles.onTrackChip, { backgroundColor: t.success + '22', borderRadius: t.radius.sm }]}>
              <Text style={[typography.micro, { color: t.success }]}>On track for the day</Text>
            </View>
            {[
              { label: 'Carbs',   val: model.carbs,   max: 240, color: '#E3B79A' },
              { label: 'Protein', val: model.protein, max: 120, color: t.brand },
              { label: 'Fat',     val: model.fat,     max: 65,  color: '#5B90C4' },
            ].map((m) => (
              <View key={m.label} style={styles.macroBarRow}>
                <Text style={[typography.micro, { color: t.ink3, width: 44 }]}>{m.label}</Text>
                <View style={[styles.barTrack, { backgroundColor: t.border, flex: 1 }]}>
                  <View style={[styles.barFill, { width: `${Math.min(m.val / m.max, 1) * 100}%`, backgroundColor: m.color }]} />
                </View>
                <Text style={[typography.micro, tabularNums, { color: t.ink2, width: 32, textAlign: 'right' }]}>{m.val}g</Text>
              </View>
            ))}
          </View>
        </View>
      </Card>

      <Text style={[typography.h3, { color: t.ink, marginTop: 16, marginBottom: 8 }]}>What's in it</Text>
      <Card tight>
        {ingredients.isLoading && <ApiState title="Loading ingredients" loading />}
        {ingredients.error && (
          <ApiState
            title="Ingredients unavailable"
            message={ingredients.error.message}
            actionLabel="Retry"
            onAction={ingredients.reload}
          />
        )}
        {!ingredients.isLoading && !ingredients.error && (ingredients.data ?? []).length === 0 && (
          <Text style={[typography.body, { color: t.ink3 }]}>No ingredient breakdown available for this meal.</Text>
        )}
        {!ingredients.isLoading && !ingredients.error && (ingredients.data ?? []).map((item) => (
          <IngredientRow
            key={`${item.name}-${item.grams}-${item.kcal}`}
            name={item.name}
            grams={Math.round(item.grams)}
            kcal={Math.round(item.kcal)}
            carbs={Math.round(item.carbs_g)}
            protein={Math.round(item.protein_g)}
            fat={Math.round(item.fat_g)}
          />
        ))}
      </Card>

      <Text style={[typography.h3, { color: t.ink, marginTop: 16, marginBottom: 8 }]}>Micronutrients</Text>
      <Card tight>
        {model.micronutrients.map((m) => {
          const pct = Math.min((m.value || 0) / m.max, 1);
          const barColor = m.warn ? t.warning : t.brand;
          return (
            <View key={m.label} style={styles.microRow}>
              <Text style={[typography.caption, { color: t.ink2, width: 60 }]}>{m.label}</Text>
              <View style={[styles.barTrack, { backgroundColor: t.border, flex: 1 }]}>
                <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
              </View>
              <Text style={[typography.micro, tabularNums, { color: m.warn ? t.warning : t.ink3, width: 56, textAlign: 'right' }]}>
                {m.value.toFixed(1)}{m.unit}
              </Text>
            </View>
          );
        })}
      </Card>

      {model.micronutrients.some((m) => m.warn) && (
        <Card tight style={{ ...styles.healthCard, backgroundColor: t.warning + '18', borderColor: t.warning + '44' }}>
          <View style={styles.healthRow}>
            <IconHeartPulse size={18} color={t.warning} />
            <View style={styles.healthText}>
              <Text style={[typography.bodyMed, { color: t.ink }]}>Nutrition note</Text>
              <Text style={[typography.caption, { color: t.ink2 }]}>
                One or more micronutrients exceed recommended daily thresholds.
              </Text>
            </View>
          </View>
        </Card>
      )}

      {isEditing && (
        <Card tight style={styles.editCard}>
          <Text style={[typography.bodyMed, { color: t.ink, marginBottom: 8 }]}>Meal name</Text>
          <TextInput
            value={draftName}
            onChangeText={setDraftName}
            placeholder="Meal name"
            placeholderTextColor={t.ink3}
            style={[styles.editInput, { backgroundColor: t.card, borderColor: t.border, color: t.ink }]}
          />
          {editError && <Text style={[typography.caption, { color: t.danger, marginTop: 8 }]}>{editError}</Text>}
        </Card>
      )}

      <View style={styles.btnRow}>
        <Button label="Duplicate" variant="ghost" style={{ flex: 1 }} onPress={() => router.push('/meals/add' as never)} />
        {isEditing && <Button label="Cancel" variant="ghost" style={{ flex: 1 }} onPress={() => setIsEditing(false)} />}
        <Button
          label={isEditing ? (savingEdit ? 'Saving...' : 'Save edit') : 'Edit meal'}
          variant="solid"
          style={{ flex: isEditing ? 1 : 2 }}
          onPress={isEditing ? handleSaveEdit : () => setIsEditing(true)}
          loading={savingEdit}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  backBtn:      { width: 40 },
  topActions:   { flexDirection: 'row', alignItems: 'center' },
  // No double-applying corner radius — borderRadius set via inline only
  heroPhoto:    { height: 200, borderWidth: StyleSheet.hairlineWidth, marginBottom: 14, overflow: 'hidden' },
  heroImage:    { width: '100%', height: '100%' },
  blob:         { position: 'absolute', borderRadius: 50, opacity: 0.85 },
  aiChip:       { position: 'absolute', top: 12, left: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  titleBlock:   { marginBottom: 14 },
  macrosCard:   { marginBottom: 4 },
  macrosRow:    { flexDirection: 'row', gap: 16, alignItems: 'center' },
  macrosBars:   { flex: 1, gap: 6 },
  onTrackChip:  { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  macroBarRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barTrack:     { height: 5, borderRadius: 3, overflow: 'hidden' },
  barFill:      { height: 5, borderRadius: 3 },
  microRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  healthCard:   { marginTop: 12, borderWidth: 1 },
  healthRow:    { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  healthText:   { flex: 1, gap: 3 },
  editCard:     { marginTop: 14 },
  editInput:    { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  btnRow:       { flexDirection: 'row', gap: 10, marginTop: 20 },
});
