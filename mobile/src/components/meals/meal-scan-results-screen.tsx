import React, { useCallback, useMemo, useState } from 'react';
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
import { useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { mealService } from '../../api/services';

function BackBar({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.backBar}>
      <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
        <ChevronLeft size={24} color={t.ink} />
      </Pressable>
      <Text style={[typography.h3, { flex: 1, color: t.ink }]}>{title}</Text>
      {right}
    </View>
  );
}

export function MealScanResultsScreen() {
  const router = useRouter();
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const params = useLocalSearchParams<{ mealId?: string | string[] }>();
  const mealId = Array.isArray(params.mealId) ? params.mealId[0] : params.mealId;
  const loadMeal = useCallback(() => mealService.detail(mealId ?? ''), [mealId]);
  const loadIngredients = useCallback(() => mealService.ingredients(mealId ?? ''), [mealId]);
  const meal = useApiQuery(queryKeys.meal(mealId ?? 'missing'), loadMeal, { enabled: Boolean(mealId) });
  const ingredients = useApiQuery(queryKeys.mealIngredients(mealId ?? 'missing'), loadIngredients, { enabled: Boolean(mealId) });
  const [feedback, setFeedback] = useState<string | null>(null);

  const nutrition = meal.data?.nutrition_result ?? null;
  const calories = Math.round(nutrition?.calories ?? 0);
  const rawConfidence = nutrition?.confidence ?? 0;
  const confidence = Math.round(rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence);
  const displayName = nutrition?.dish_name || meal.data?.name || 'Scanned meal';
  const macros = useMemo(() => [
    { label: i18n('meals.carbs'),   value: Math.round(nutrition?.carbs_g ?? 0),   unit: 'g', color: '#E3B79A' },
    { label: i18n('meals.protein'), value: Math.round(nutrition?.protein_g ?? 0), unit: 'g', color: t.brand },
    { label: i18n('meals.fat'),     value: Math.round(nutrition?.fat_g ?? 0),     unit: 'g', color: '#5B90C4' },
  ], [i18n, nutrition?.carbs_g, nutrition?.fat_g, nutrition?.protein_g, t.brand]);

  if (!mealId) {
    return (
      <Screen>
        <ApiState title={i18n('api.unavailable')} message="Missing meal id for scan results." actionLabel={i18n('common.back')} onAction={() => router.back()} />
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
        <ApiState title={i18n('api.unavailable')} message="Backend returned empty scan result." actionLabel={i18n('common.back')} onAction={() => router.back()} />
      </Screen>
    );
  }

  const scanMeal = meal.data;

  return (
    <Screen>
      <BackBar
        title="Confirm meal"
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

      {feedback && (
        <ApiState
          title="Scan edit unavailable"
          message={feedback}
          actionLabel={i18n('common.close')}
          onAction={() => setFeedback(null)}
        />
      )}

      {/* Warm food photo card — dark bg with plate */}
      <View style={[styles.photoCard, { borderRadius: t.radius.lg, borderColor: t.border }]}>
        {scanMeal.image_url ? (
          <Image source={{ uri: scanMeal.image_url }} style={styles.photoImage} resizeMode="cover" />
        ) : (
          <View style={styles.plateCircle}>
            <View style={[styles.blob, { backgroundColor: '#8B4513', width: 110, height: 70, top: 30, left: 55 }]} />
            <View style={[styles.blob, { backgroundColor: '#D4C5A0', width: 100, height: 45, top: 75, left: 45 }]} />
            <View style={[styles.blob, { backgroundColor: '#4A7C59', width: 70, height: 55, top: 55, right: 15 }]} />
          </View>
        )}
        {/* Detected pill */}
        <View style={styles.detectedPill}>
          <Text style={[typography.micro, { color: '#fff' }]}>Detected</Text>
        </View>
      </View>

      {/* Match header */}
      <Card tight style={styles.matchCard}>
        <View style={styles.matchRow}>
          <View style={styles.matchLeft}>
            <Text style={[typography.micro, { color: t.ink3, letterSpacing: 0.5 }]}>
              BEST MATCH{confidence ? ` · ${confidence}%` : ''}
            </Text>
            <Text style={[typography.title, { color: t.ink, marginTop: 2 }]}>{displayName}</Text>
            {/* Subtitle */}
            <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>
              {nutrition?.serving_type ?? scanMeal.status}
            </Text>
          </View>
          <Pressable
            onPress={() => setFeedback('Changing detected foods is guarded until Core exposes an ingredient correction contract.')}
            style={[styles.changeBtn, { borderColor: t.border, borderRadius: t.radius.pill }]}
          >
            <Text style={[typography.chip, { color: t.ink2 }]}>Change</Text>
          </Pressable>
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
        <Text style={[typography.micro, { color: t.ink3, marginTop: 4, textAlign: 'center' }]}>kcal estimated</Text>
      </Card>

      {/* Items detected */}
      <Text style={[typography.h3, { color: t.ink, marginTop: 16, marginBottom: 8 }]}>{i18n('meals.ingredients')}</Text>
      <Card style={{ padding: 0, paddingHorizontal: 12 }}>
        {ingredients.isLoading && <ApiState title={i18n('api.loading')} loading />}
        {ingredients.error && (
          <ApiState title={i18n('api.unavailable')} message={ingredients.error.message} actionLabel={i18n('common.retry')} onAction={ingredients.reload} />
        )}
        {!ingredients.isLoading && !ingredients.error && (ingredients.data ?? []).length === 0 && (
          <Text style={[typography.body, { color: t.ink3, paddingVertical: 12 }]}>No ingredient breakdown returned yet.</Text>
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
                <Text style={[typography.micro, { color: '#D97706', marginLeft: 3 }]}>Low confidence</Text>
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
            <Text style={[typography.micro, { color: t.ink3 }]}>Add to</Text>
            <Text style={[typography.bodyMed, { color: t.ink }]}>
              {new Date(scanMeal.logged_at).toLocaleString()}
            </Text>
          </View>
          <Text style={[typography.caption, { color: t.brand }]}>{scanMeal.status}</Text>
        </View>
      </Card>

      {/* Action buttons */}
      <View style={styles.btnRow}>
        <Button label={i18n('meals.retake')} variant="ghost" style={{ flex: 1 }} onPress={() => router.push('/meals/scan' as never)} />
        <Button label={i18n('meals.addToLog')} variant="solid" style={{ flex: 2 }} onPress={() => router.replace(`/meals/${scanMeal.id}` as never)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  backBtn:      { width: 40 },
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
  changeBtn:    { paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1 },
  summaryCard:  { marginBottom: 4 },
  summaryRow:   { flexDirection: 'row', alignItems: 'center', gap: 16 },
  macroGrid:    { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  // Label column instead of dot
  macroItem:    { alignItems: 'center', gap: 2 },
  detectedRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  detectedInfo: { flex: 1, gap: 1 },
  detectedRight:{ alignItems: 'flex-end', gap: 3 },
  warnChip:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  slotCard:     { marginTop: 12 },
  slotRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  slotText:     { flex: 1, gap: 1 },
  btnRow:       { flexDirection: 'row', gap: 10, marginTop: 20 },
});
