import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../layout/screen';
import { SectionHeader } from '../layout/section-header';
import { Card } from '../primitives/card';
import { Button } from '../primitives/button';
import { IconButton } from '../primitives/icon-button';
import { ApiState } from '../api/api-state';
import { FoodRow } from './food-row';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { ChevronLeft, IconSearch, IconCamera, IconUtensils, IconClock, IconX } from '../../icons';
import { mealService, nutritionService } from '../../api/services';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import type { IngredientCatalogItem } from '../../../../shared/api-contracts';
import {
  frequentMealHistoryRows,
  historyMealIngredient,
  historySelectionNote,
  recentMealHistoryRows,
  type AddMealHistoryRow,
} from './add-meal-history';

const SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
type Slot = (typeof SLOTS)[number];

function toMealType(slot: Slot) {
  return slot.toLowerCase() as 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export function AddMealScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const router = useRouter();
  const [slot, setSlot] = useState<Slot>('Lunch');
  const [manualVisible, setManualVisible] = useState(true);
  const [manualName, setManualName] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<IngredientCatalogItem[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientCatalogItem | null>(null);
  const [selectedHistoryRow, setSelectedHistoryRow] = useState<AddMealHistoryRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);
  const searchRequestId = useRef(0);

  const loadHistory = useCallback(() => mealService.list({ page: 1, per_page: 20 }), []);
  const history = useApiQuery(queryKeys.meals('history-reuse'), loadHistory);

  const SLOT_LABELS: Record<Slot, string> = {
    Breakfast: i18n('meals.breakfast'),
    Lunch:     i18n('meals.lunch'),
    Dinner:    i18n('meals.dinner'),
    Snack:     i18n('meals.snack'),
  };

  const METHOD_CARD_MANUAL_I18N = {
    label: i18n('meals.manualEntry'),
    sub: i18n('meals.customDish'),
    Icon: IconUtensils,
    onPress: () => {
      setFeedback(null);
      setManualVisible(true);
    },
  };
  const METHOD_CARD_HISTORY_I18N = {
    label: i18n('meals.fromHistory'),
    sub: i18n('meals.recentMeals'),
    Icon: IconClock,
    onPress: () => handleHistoryShortcut(),
  };

  const recentRows = useMemo(
    () => recentMealHistoryRows(history.data ?? []),
    [history.data],
  );
  const frequentRows = useMemo(
    () => frequentMealHistoryRows(history.data ?? [], toMealType(slot)),
    [history.data, slot],
  );

  async function handleManualSave() {
    const name = manualName.trim();
    if (!name) {
      setFeedback({ title: 'Meal not saved', message: 'Enter a meal name before saving.' });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      await mealService.create({
        name,
        notes: manualNotes.trim() || null,
        logged_at: new Date().toISOString(),
        meal_type: toMealType(slot),
        ingredients: selectedIngredient
          ? [toMealCreateIngredient(selectedIngredient)]
          : selectedHistoryRow ? historyMealIngredient(selectedHistoryRow) : undefined,
      });
      invalidateApiQuery('meals.');
      router.replace('/meals' as never);
    } catch (err) {
      setFeedback({
        title: 'Meal not saved',
        message: err instanceof Error ? err.message : 'Unable to save meal.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSearchSubmit() {
    const query = searchText.trim();
    if (!query) return;
    const requestId = searchRequestId.current + 1;
    searchRequestId.current = requestId;
    setSearching(true);
    setSearchResults([]);
    setFeedback(null);
    try {
      const items = await nutritionService.ingredients({ q: query, per_page: 8 });
      if (requestId !== searchRequestId.current) return;
      setSearchResults(items);
      if (items.length === 0) {
        setFeedback({
          title: 'No foods found',
          message: 'Try another name or save the meal manually.',
        });
      }
    } catch (err) {
      if (requestId !== searchRequestId.current) return;
      setFeedback({
        title: 'Food search failed',
        message: err instanceof Error ? err.message : 'Unable to search foods.',
      });
    } finally {
      if (requestId === searchRequestId.current) {
        setSearching(false);
      }
    }
  }

  function handleIngredientSelect(item: IngredientCatalogItem) {
    const name = displayIngredientName(item);
    setSelectedIngredient(item);
    setSelectedHistoryRow(null);
    setManualName(name);
    setManualNotes(ingredientServingLabel(item));
    setManualVisible(true);
    setFeedback({
      title: 'Ingredient selected',
      message: `${name} is ready to save as a ${SLOT_LABELS[slot].toLowerCase()} meal.`,
    });
  }

  function handleHistoryShortcut() {
    if (history.error) {
      void history.reload();
      setFeedback({
        title: 'Reloading meal history',
        message: 'Retrying Core meal history now.',
      });
      return;
    }
    if (history.isLoading) {
      setFeedback({
        title: 'Loading meal history',
        message: 'Recent meals are loading from Core.',
      });
      return;
    }
    setFeedback({
      title: recentRows.length ? 'Meal history ready' : 'No meal history yet',
      message: recentRows.length
        ? 'Pick a recent or frequent meal below to prefill manual entry.'
        : 'Log a meal first, then it will appear here for reuse.',
    });
  }

  function handleHistorySelect(row: AddMealHistoryRow) {
    setSelectedHistoryRow(row);
    setSelectedIngredient(null);
    setManualName(row.name);
    setManualNotes(historySelectionNote(row));
    setManualVisible(true);
    setFeedback({
      title: 'History meal selected',
      message: `${row.name} is ready to save as a ${SLOT_LABELS[slot].toLowerCase()} meal.`,
    });
  }

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
          <ChevronLeft size={24} color={t.ink} />
        </Pressable>
        <Text style={[typography.h3, styles.headerTitle, { color: t.ink }]}>{i18n('meals.addMeal')}</Text>
        <IconButton
          icon={<IconX size={18} color={t.ink} />}
          variant="subtle"
          onPress={() => router.back()}
          accessibilityLabel={i18n('common.close')}
        />
      </View>

      {/* Slot picker — pill shape, active = brand bg */}
      <View style={styles.slotGrid}>
        {SLOTS.map((s) => (
          <Pressable
            key={s}
            onPress={() => setSlot(s)}
            style={[
              styles.slotChip,
              {
                backgroundColor: slot === s ? t.brand : t.bgElev,
                borderColor: slot === s ? t.brand : t.border,
                borderRadius: t.radius.pill,
                borderWidth: 1,
              },
            ]}
          >
            <Text style={[typography.chip, { color: slot === s ? '#fff' : t.ink2 }]}>{SLOT_LABELS[s]}</Text>
          </Pressable>
        ))}
      </View>

      {/* Search bar — 48px effective height */}
      <View style={[styles.searchBar, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.pill }]}>
        <IconSearch size={16} color={t.ink3} />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
          style={[typography.body, styles.searchInput, { color: t.ink }]}
          placeholder={i18n('meals.searchFoods')}
          placeholderTextColor={t.ink3}
        />
      </View>

      {searching && <ApiState title="Searching foods" loading />}

      {!searching && searchResults.length > 0 && (
        <>
          <SectionHeader title="Search results" />
          <Card style={{ padding: 0, paddingHorizontal: 12, marginBottom: 4 }}>
            {searchResults.map((item) => (
              <FoodRow
                key={item.id}
                name={displayIngredientName(item)}
                serving={`${ingredientServingLabel(item)} · ${Math.round(item.calories_per_100g)} kcal`}
                kcal={Math.round(item.calories_per_100g)}
                subtitle={`${roundMacro(item.protein_per_100g)}g protein · ${roundMacro(item.carbs_per_100g)}g carbs · ${roundMacro(item.fat_per_100g)}g fat`}
                icon={<IconUtensils size={18} color={t.brand} />}
                onPress={() => handleIngredientSelect(item)}
              />
            ))}
          </Card>
        </>
      )}

      {/* AI scan hero */}
      <Pressable
        onPress={() => router.push('/meals/scan' as never)}
        style={[styles.aiHero, { backgroundColor: t.brand, borderRadius: t.radius.xl, overflow: 'hidden' }]}
      >
        {/* Decorative circle — larger, more opaque */}
        <View style={[styles.aiCircle, { backgroundColor: 'rgba(255,255,255,0.15)' }]} pointerEvents="none" />
        {/* Icon tile — darker frosted glass */}
        <View style={[styles.aiIconTile, { backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: t.radius.md }]}>
          <IconCamera size={24} color="#fff" />
        </View>
        {/* Text stack */}
        <View style={styles.flex}>
          <Text style={[typography.bodyMed, { color: '#fff' }]}>{i18n('meals.scanWithAi')}</Text>
          <Text style={[typography.caption, { color: 'rgba(255,255,255,0.75)', marginTop: 2 }]}>{i18n('meals.snapYourPlate')}</Text>
        </View>
        {/* NEW badge — white bg, brand text, pill */}
        <View style={[styles.newBadge, { backgroundColor: '#fff', borderRadius: t.radius.pill }]}>
          <Text style={[typography.micro, { color: t.brand }]}>{i18n('meals.new')}</Text>
        </View>
      </Pressable>

      {/* Method cards — only supported Core-backed entry paths */}
      <View style={styles.methodGrid}>
        <Pressable
          onPress={METHOD_CARD_MANUAL_I18N.onPress}
          style={[styles.methodCardFull, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg }]}
        >
          <View style={[styles.methodIconSq, { backgroundColor: t.brandSoft, borderRadius: t.radius.md }]}>
            <METHOD_CARD_MANUAL_I18N.Icon size={22} color={t.brand} />
          </View>
          <View style={styles.methodCardFullText}>
            <Text style={[typography.bodyMed, { color: t.ink }]}>{METHOD_CARD_MANUAL_I18N.label}</Text>
            <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>{METHOD_CARD_MANUAL_I18N.sub}</Text>
          </View>
        </Pressable>
        <Pressable
          onPress={METHOD_CARD_HISTORY_I18N.onPress}
          style={[styles.methodCardFull, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg }]}
        >
          <View style={[styles.methodIconSq, { backgroundColor: t.brandSoft, borderRadius: t.radius.md }]}>
            <METHOD_CARD_HISTORY_I18N.Icon size={22} color={t.brand} />
          </View>
          <View style={styles.methodCardFullText}>
            <Text style={[typography.bodyMed, { color: t.ink }]}>{METHOD_CARD_HISTORY_I18N.label}</Text>
            <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>{METHOD_CARD_HISTORY_I18N.sub}</Text>
          </View>
        </Pressable>
      </View>

      {feedback && <ApiState title={feedback.title} message={feedback.message} />}

      {manualVisible && (
        <Card style={styles.manualCard}>
          <Text style={[typography.bodyMed, { color: t.ink }]}>{i18n('meals.manualEntry')}</Text>
          <TextInput
            value={manualName}
            onChangeText={(value) => {
              setManualName(value);
              setSelectedIngredient(null);
              setSelectedHistoryRow(null);
            }}
            placeholder="e.g. Grilled chicken rice"
            placeholderTextColor={t.ink3}
            style={[typography.body, styles.manualInput, { color: t.ink, borderColor: t.border, borderRadius: t.radius.md }]}
          />
          <TextInput
            value={manualNotes}
            onChangeText={setManualNotes}
            placeholder="Notes, portion, ingredients"
            placeholderTextColor={t.ink3}
            multiline
            numberOfLines={3}
            style={[typography.body, styles.manualInput, styles.manualNotes, { color: t.ink, borderColor: t.border, borderRadius: t.radius.md }]}
          />
          <Button
            label={saving ? 'Saving meal...' : 'Save meal'}
            onPress={handleManualSave}
            loading={saving}
            disabled={saving || !manualName.trim()}
          />
        </Card>
      )}

      {/* Frequent */}
      <SectionHeader title={i18n('meals.frequentForSlot', { slot: SLOT_LABELS[slot] })} />
      <Card style={{ padding: 0, paddingHorizontal: 12 }}>
        {history.isLoading && <ApiState title="Loading meal history" loading />}
        {history.error && (
          <ApiState title="Meal history unavailable" message={history.error.message} actionLabel={i18n('common.retry')} onAction={history.reload} />
        )}
        {!history.isLoading && !history.error && frequentRows.length === 0 && (
          <Text style={[typography.caption, styles.emptyText, { color: t.ink3 }]}>No repeated {SLOT_LABELS[slot].toLowerCase()} meals yet.</Text>
        )}
        {!history.isLoading && !history.error && frequentRows.map((row) => (
          <FoodRow
            key={`frequent-${row.id}`}
            name={row.name}
            serving={row.serving}
            kcal={row.kcal}
            frequencyLabel={row.frequencyLabel}
            subtitle={row.subtitle}
            icon={<IconUtensils size={18} color={t.brand} />}
            onPress={() => handleHistorySelect(row)}
          />
        ))}
      </Card>

      {/* Recent */}
      <SectionHeader title={i18n('meals.recentlyLogged')} />
      <Card style={{ padding: 0, paddingHorizontal: 12 }}>
        {history.isLoading && <ApiState title="Loading recent meals" loading />}
        {history.error && (
          <ApiState title="Recent meals unavailable" message={history.error.message} actionLabel={i18n('common.retry')} onAction={history.reload} />
        )}
        {!history.isLoading && !history.error && recentRows.length === 0 && (
          <Text style={[typography.caption, styles.emptyText, { color: t.ink3 }]}>No recent meals found.</Text>
        )}
        {!history.isLoading && !history.error && recentRows.map((row) => (
          <FoodRow
            key={`recent-${row.id}`}
            name={row.name}
            serving={row.serving}
            kcal={row.kcal}
            subtitle={row.subtitle}
            icon={<IconUtensils size={18} color={t.brand} />}
            onPress={() => handleHistorySelect(row)}
          />
        ))}
      </Card>
    </Screen>
  );
}

function displayIngredientName(item: IngredientCatalogItem) {
  return item.name_vi || item.name_en;
}

function roundMacro(value: number) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;
}

function ingredientServingLabel(item: IngredientCatalogItem) {
  const unit = item.unit_hint.trim().toLowerCase();
  if (unit === 'gram' || unit === 'grams' || unit === 'g') return '100 g';
  if (unit === 'milliliter' || unit === 'milliliters' || unit === 'ml') return '100 ml';
  return `100 ${item.unit_hint.trim() || 'g'}`;
}

function toMealCreateIngredient(item: IngredientCatalogItem) {
  return {
    ingredient_id: item.id,
    ingredient_name: displayIngredientName(item),
    ingredient_name_en: item.name_en,
    grams: 100,
    manual_calories: roundMacro(item.calories_per_100g),
    calories: roundMacro(item.calories_per_100g),
    kcal: roundMacro(item.calories_per_100g),
    carbs_g: roundMacro(item.carbs_per_100g),
    protein_g: roundMacro(item.protein_per_100g),
    fat_g: roundMacro(item.fat_per_100g),
    is_matched: true,
  };
}

const styles = StyleSheet.create({
  header:             { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  headerBtn:          { width: 40, alignItems: 'flex-start' },
  headerTitle:        { flex: 1, textAlign: 'center' },
  slotGrid:           { flexDirection: 'row', gap: 8, marginBottom: 14 },
  slotChip:           { flex: 1, alignItems: 'center', paddingVertical: 10 },
  searchBar:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, marginBottom: 14, gap: 8 },
  searchInput:        { flex: 1, padding: 0 },
  aiHero:             { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14, marginBottom: 12 },
  // 130px diameter circle, moved right: -34
  aiCircle:           { position: 'absolute', right: -34, top: -35, width: 130, height: 130, borderRadius: 65 },
  aiIconTile:         { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  flex:               { flex: 1 },
  newBadge:           { paddingHorizontal: 7, paddingVertical: 3 },
  methodGrid:         { gap: 10, marginBottom: 4 },
  methodCardFull:     { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14, borderWidth: StyleSheet.hairlineWidth },
  methodCardFullText: { flex: 1 },
  methodIconSq:       { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  manualCard:         { gap: 10, marginTop: 8, marginBottom: 4 },
  manualInput:        { borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 10 },
  manualNotes:        { minHeight: 76, textAlignVertical: 'top' },
  emptyText:          { paddingVertical: 14, textAlign: 'center' },
});
