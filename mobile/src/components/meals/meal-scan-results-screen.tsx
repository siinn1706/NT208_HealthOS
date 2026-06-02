import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../layout/screen';
import { Card } from '../primitives/card';
import { Button } from '../primitives/button';
import { IconButton } from '../primitives/icon-button';
import { ApiState } from '../api/api-state';
import { ProgressRing } from '../charts/progress-ring';
import { IngredientRow } from './ingredient-row';
import { useTheme } from '../../theme/useTheme';
import { typography, tabularNums } from '../../theme/typography';
import { ChevronLeft, IconRefresh, IconClock, IconAlert } from '../../icons';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { mealService } from '../../api/services';
import type { MealNutritionResult } from '../../../../shared/api-contracts';

type PortionValue = 'small' | 'medium' | 'large';

interface PortionOption {
  value: PortionValue;
  label: string;
  scale: number;
  calories?: number | null;
  calorieMin?: number | null;
  calorieMax?: number | null;
  carbs?: number | null;
  protein?: number | null;
  fat?: number | null;
}

const getDefaultPortions = (i18n: (key: string) => string): PortionOption[] => [
  { value: 'small', label: i18n('meals.portionSmall'), scale: 0.75 },
  { value: 'medium', label: i18n('meals.portionMedium'), scale: 1 },
  { value: 'large', label: i18n('meals.portionLarge'), scale: 1.25 },
];

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(value, 0) : null;
}

function normalizePortions(nutrition: MealNutritionResult | null, i18n: (key: string) => string): PortionOption[] {
  const raw = nutrition?.portion_options;
  if (!Array.isArray(raw)) return getDefaultPortions(i18n);
  const options = raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const value = record.value;
    const label = record.label;
    const scale = readNumber(record.scale ?? record.multiplier);
    if (
      (value === 'small' || value === 'medium' || value === 'large') &&
      typeof label === 'string' &&
      label.trim() &&
      scale !== null &&
      scale > 0
    ) {
      return [{
        value: value as PortionValue,
        label: label.trim(),
        scale,
        calories: readNumber(record.calories),
        calorieMin: readNumber(record.calorie_min),
        calorieMax: readNumber(record.calorie_max),
        carbs: readNumber(record.carbs_g),
        protein: readNumber(record.protein_g),
        fat: readNumber(record.fat_g),
      }];
    }
    return [];
  });
  return options.length > 0 ? options : getDefaultPortions(i18n);
}

function scaleNutrition(nutrition: MealNutritionResult | null, option: PortionOption) {
  const scale = option.scale;
  const calories = Math.round(option.calories ?? ((nutrition?.calories ?? 0) * scale));
  const calorieMin = Math.round(option.calorieMin ?? ((nutrition?.calorie_min ?? nutrition?.calories ?? 0) * scale));
  const calorieMax = Math.round(option.calorieMax ?? ((nutrition?.calorie_max ?? nutrition?.calories ?? 0) * scale));
  return {
    calories,
    calorieMin,
    calorieMax,
    carbs: Math.round(option.carbs ?? ((nutrition?.carbs_g ?? 0) * scale)),
    protein: Math.round(option.protein ?? ((nutrition?.protein_g ?? 0) * scale)),
    fat: Math.round(option.fat ?? ((nutrition?.fat_g ?? 0) * scale)),
  };
}

function buildScaledNutritionResult(
  nutrition: MealNutritionResult | null,
  selectedPortion: PortionOption,
): MealNutritionResult {
  const scaled = scaleNutrition(nutrition, selectedPortion);
  const base: MealNutritionResult = nutrition ?? {
    dish_name: null,
    serving_type: null,
    calories: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    saturates_g: null,
    sugar_g: null,
    salt_g: null,
    confidence: null,
    source: null,
  };
  return {
    ...base,
    calories: scaled.calories,
    calorie_min: scaled.calorieMin,
    calorie_max: scaled.calorieMax,
    carbs_g: scaled.carbs,
    protein_g: scaled.protein,
    fat_g: scaled.fat,
    portion_estimate: selectedPortion.value,
  };
}

function BackBar({
  title,
  backLabel,
  onBack,
  right,
}: {
  title: string;
  backLabel: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={styles.backBar}>
      <Pressable
        onPress={onBack}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        style={({ pressed }) => [
          styles.backBtn,
          { backgroundColor: t.card, borderColor: t.border },
          pressed && styles.pressed,
        ]}
      >
        <ChevronLeft size={24} color={t.ink} />
      </Pressable>
      <Text style={[typography.h3, { flex: 1, color: t.ink }]}>{title}</Text>
      {right}
    </View>
  );
}

function buildMealDetailRoute(mealId: string, imageUri?: string | null) {
  if (!imageUri) return `/meals/${mealId}`;
  const params = new URLSearchParams({ imageUri });
  return `/meals/${mealId}?${params.toString()}`;
}

export function MealScanResultsScreen() {
  const router = useRouter();
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const params = useLocalSearchParams<{ mealId?: string | string[]; imageUri?: string | string[] }>();
  const mealId = firstParam(params.mealId);
  const capturedImageUri = firstParam(params.imageUri);
  const loadMeal = useCallback(() => mealService.detail(mealId ?? ''), [mealId]);
  const loadIngredients = useCallback(() => mealService.ingredients(mealId ?? ''), [mealId]);
  const meal = useApiQuery(queryKeys.meal(mealId ?? 'missing'), loadMeal, { enabled: Boolean(mealId) });
  const ingredients = useApiQuery(queryKeys.mealIngredients(mealId ?? 'missing'), loadIngredients, { enabled: Boolean(mealId) });
  const [selectedPortion, setSelectedPortion] = useState<PortionValue>('medium');
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const nutrition = meal.data?.nutrition_result ?? null;
  const portionOptions = useMemo(() => normalizePortions(nutrition, i18n), [nutrition, i18n]);
  const defaultPortions = useMemo(() => getDefaultPortions(i18n), [i18n]);
  const selectedOption = portionOptions.find((item) => item.value === selectedPortion) ?? defaultPortions[1];
  const scaled = scaleNutrition(nutrition, selectedOption);
  const calories = scaled.calories;
  const rawConfidence = nutrition?.confidence ?? 0;
  const confidence = Math.round(rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence);
  const displayName = nutrition?.dish_name || meal.data?.name || i18n('meals.scannedMealName');
  const macros = useMemo(() => [
    { label: i18n('meals.carbs'),   value: scaled.carbs,   unit: 'g', color: '#E3B79A' },
    { label: i18n('meals.protein'), value: scaled.protein, unit: 'g', color: t.brand },
    { label: i18n('meals.fat'),     value: scaled.fat,     unit: 'g', color: '#5B90C4' },
  ], [i18n, scaled.carbs, scaled.fat, scaled.protein, t.brand]);
  const warnings = Array.isArray(nutrition?.warnings)
    ? nutrition.warnings.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

  useEffect(() => {
    const persistedPortion = nutrition?.portion_estimate;
    const matchedOption = portionOptions.find(
      (option) => option.value === persistedPortion || option.label === persistedPortion,
    );
    if (matchedOption && matchedOption.value !== selectedPortion) {
      setSelectedPortion(matchedOption.value);
    }
  }, [nutrition?.portion_estimate, portionOptions, selectedPortion]);

  const handleConfirmMeal = useCallback(async () => {
    if (!meal.data || isConfirming) return;
    setIsConfirming(true);
    setConfirmError(null);
    try {
      await mealService.update(meal.data.id, {
        nutrition_result: buildScaledNutritionResult(meal.data.nutrition_result, selectedOption),
      });
      invalidateApiQuery('meals.');
      invalidateApiQuery(queryKeys.meal(meal.data.id));
      router.replace(buildMealDetailRoute(meal.data.id, capturedImageUri) as never);
    } catch (err) {
      setConfirmError(err instanceof Error && err.message ? err.message : i18n('meals.confirmMealSaveFailed'));
      setIsConfirming(false);
      return;
    }
    setIsConfirming(false);
  }, [capturedImageUri, i18n, isConfirming, meal.data, selectedOption, router]);

  if (!mealId) {
    return (
      <Screen>
        <ApiState
          title={i18n('api.unavailable')}
          message={i18n('meals.scanResultsMissingMealId')}
          actionLabel={i18n('common.back')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  if (meal.isLoading) {
    return (
      <Screen>
        <ApiState title={i18n('api.loading')} loading />
      </Screen>
    );
  }

  if (meal.error) {
    return (
      <Screen>
        <ApiState title={i18n('api.unavailable')} message={meal.error.message} actionLabel={i18n('common.retry')} onAction={meal.reload} />
      </Screen>
    );
  }

  if (!meal.data) {
    return (
      <Screen>
        <ApiState
          title={i18n('api.unavailable')}
          message={i18n('meals.emptyScanResult')}
          actionLabel={i18n('common.back')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const scanMeal = meal.data;
  const displayImageUri = capturedImageUri ?? scanMeal.image_url;

  return (
    <Screen>
      <BackBar
        title={i18n('meals.confirmMeal')}
        backLabel={i18n('common.back')}
        onBack={() => router.back()}
        right={
          <IconButton
            variant="subtle"
            size={40}
            icon={<IconRefresh size={20} color={t.ink3} />}
            accessibilityLabel={i18n('common.retry')}
            onPress={() => {
              meal.reload();
              ingredients.reload();
            }}
          />
        }
      />

      {/* Warm food photo card — dark bg with plate */}
      <View style={[styles.photoCard, { borderRadius: t.radius.lg, borderColor: t.border }]}>
        {displayImageUri ? (
          <Image testID="meal-scan-results-photo" source={{ uri: displayImageUri }} style={styles.photoImage} resizeMode="cover" />
        ) : (
          <View style={styles.plateCircle}>
            <View style={[styles.blob, { backgroundColor: '#8B4513', width: 110, height: 70, top: 30, left: 55 }]} />
            <View style={[styles.blob, { backgroundColor: '#D4C5A0', width: 100, height: 45, top: 75, left: 45 }]} />
            <View style={[styles.blob, { backgroundColor: '#4A7C59', width: 70, height: 55, top: 55, right: 15 }]} />
          </View>
        )}
        {/* Detected pill */}
        <View style={styles.detectedPill}>
          <Text style={[typography.micro, { color: '#fff' }]}>{i18n('meals.detected')}</Text>
        </View>
      </View>

      {/* Match header */}
      <Card tight style={styles.matchCard}>
        <View style={styles.matchRow}>
          <View style={styles.matchLeft}>
            <Text style={[typography.micro, { color: t.ink3 }]}>
              {i18n('meals.bestMatch')}
              {confidence ? ` · ${confidence}%` : ''}
            </Text>
            <Text style={[typography.title, { color: t.ink, marginTop: 2 }]}>{displayName}</Text>
            {/* Subtitle */}
            <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>
              {nutrition?.serving_type ?? scanMeal.status}
            </Text>
            <Text style={[typography.micro, { color: t.ink3, marginTop: 6 }]}>
              {nutrition?.source ? nutrition.source : 'ai'}
              {warnings.length > 0 ? ` · ${warnings.length} ${i18n('meals.warningsLabel')}` : ''}
            </Text>
          </View>
        </View>
      </Card>

      {/* Calorie summary */}
      <Card tight style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <ProgressRing value={Math.min(calories / 2100, 1)} size={60} stroke={6} color={t.brand} track={t.border}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[typography.chip, tabularNums, { color: t.ink }]}>{calories}</Text>
              <Text style={[typography.micro, { color: t.ink3 }]}>KCAL</Text>
            </View>
          </ProgressRing>
          <View style={styles.macroGrid}>
            {macros.map((m) => (
              <View key={m.label} style={styles.macroItem}>
                <Text style={[typography.bodyMed, tabularNums, { color: t.ink }]}>{m.value}{m.unit}</Text>
                <Text style={[typography.micro, { color: t.ink3 }]}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={[typography.micro, { color: t.ink3, marginTop: 4, textAlign: 'center' }]}>
          {i18n('meals.estimatedCaloriesRange', { min: scaled.calorieMin, max: scaled.calorieMax })}
        </Text>
      </Card>

      <Card tight style={styles.portionCard}>
        <Text style={[typography.micro, { color: t.ink3, marginBottom: 8 }]}>{i18n('meals.portionLabel')}</Text>
        <View style={styles.portionRow}>
          {portionOptions.map((option) => {
            const active = option.value === selectedPortion;
            return (
              <Pressable
                key={option.value}
                onPress={() => setSelectedPortion(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.portionButton,
                  { borderColor: active ? t.brand : t.border, backgroundColor: active ? t.brand : t.card },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[typography.caption, { color: active ? '#fff' : t.ink }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {warnings.length > 0 && (
        <Card tight style={styles.warningCard}>
          {warnings.map((warning) => (
            <View key={warning} style={styles.warningRow}>
              <IconAlert size={12} color="#D97706" />
              <Text style={[typography.caption, { color: '#92400E', flex: 1 }]}>{warning}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Items detected */}
      <Text style={[typography.h3, { color: t.ink, marginTop: 16, marginBottom: 8 }]}>{i18n('meals.ingredients')}</Text>
      <Card style={{ padding: 0, paddingHorizontal: 12 }}>
        {ingredients.isLoading && <ApiState title={i18n('api.loading')} loading />}
        {ingredients.error && (
          <ApiState title={i18n('api.unavailable')} message={ingredients.error.message} actionLabel={i18n('common.retry')} onAction={ingredients.reload} />
        )}
        {!ingredients.isLoading && !ingredients.error && (ingredients.data ?? []).length === 0 && (
          <Text style={[typography.body, { color: t.ink3, paddingVertical: 12 }]}>{i18n('meals.noIngredientBreakdown')}</Text>
        )}
        {!ingredients.isLoading && !ingredients.error && (ingredients.data ?? []).map((item) => (
          <View key={`${item.name}-${item.grams}-${item.kcal}`}>
            <IngredientRow
              name={item.name}
              grams={Math.round(item.grams)}
              kcal={Math.round(item.kcal)}
              carbs={Math.round(item.carbs_g)}
              protein={Math.round(item.protein_g)}
              fat={Math.round(item.fat_g)}
            />
            {confidence > 0 && confidence < 60 && (
              <View style={[styles.warnChip, { backgroundColor: '#FEF3C7' }]}>
                <IconAlert size={10} color="#D97706" />
                <Text style={[typography.micro, { color: '#D97706', marginLeft: 3 }]}>{i18n('meals.lowConfidence')}</Text>
              </View>
            )}
          </View>
        ))}
      </Card>

      {/* Slot picker */}
      <Card tight style={styles.slotCard}>
        <View style={styles.slotRow}>
          <IconClock size={16} color={t.ink3} />
          <View style={styles.slotText}>
            <Text style={[typography.micro, { color: t.ink3 }]}>{i18n('meals.addTo')}</Text>
            <Text style={[typography.bodyMed, { color: t.ink }]}>
              {new Date(scanMeal.logged_at).toLocaleString()}
            </Text>
          </View>
          <Text style={[typography.caption, { color: t.brand }]}>{scanMeal.status}</Text>
        </View>
      </Card>

      {/* Action buttons */}
      <View style={styles.btnRow}>
        <Button
          label={i18n('meals.retake')}
          variant="ghost"
          style={{ flex: 1 }}
          onPress={() => router.push('/meals/scan' as never)}
          disabled={isConfirming}
        />
        <Button
          label={i18n('meals.confirmMeal')}
          variant="solid"
          style={{ flex: 2 }}
          loading={isConfirming}
          onPress={handleConfirmMeal}
          disabled={isConfirming}
        />
      </View>
      {confirmError ? (
        <Text style={[typography.caption, { color: '#ef4444', marginTop: 10 }]}>{confirmError}</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar:      { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingBottom: 12 },
  backBtn:      { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  pressed:      { opacity: 0.72 },
  // Warm dark photo card — height 180
  photoCard:    { height: 180, backgroundColor: '#2C1A0E', borderWidth: StyleSheet.hairlineWidth, marginBottom: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  // Cream plate circle centered in card
  plateCircle:  { width: 240, height: 180, borderRadius: 120, backgroundColor: '#F0E6D0', overflow: 'hidden' },
  photoImage:    { width: '100%', height: '100%' },
  blob:         { position: 'absolute', borderRadius: 50 },
  // "✦ Detected" absolute pill
  detectedPill: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  matchCard:    { marginBottom: 10 },
  matchRow:     { flexDirection: 'row', alignItems: 'center' },
  matchLeft:    { flex: 1 },
  summaryCard:  { marginBottom: 4 },
  summaryRow:   { flexDirection: 'row', alignItems: 'center', gap: 16 },
  macroGrid:    { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  // Label column instead of dot
  macroItem:    { alignItems: 'center', gap: 2 },
  portionCard:  { marginTop: 10 },
  portionRow:   { flexDirection: 'row', gap: 8 },
  portionButton:{ flex: 1, minHeight: 38, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  warningCard:  { marginTop: 10, backgroundColor: '#FEF3C7' },
  warningRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detectedRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  detectedInfo: { flex: 1, gap: 1 },
  detectedRight:{ alignItems: 'flex-end', gap: 3 },
  warnChip:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  slotCard:     { marginTop: 12 },
  slotRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  slotText:     { flex: 1, gap: 1 },
  btnRow:       { flexDirection: 'row', gap: 10, marginTop: 20 },
});
