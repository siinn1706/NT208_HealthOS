import React, { useState } from 'react';
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
import { ChevronLeft, IconSearch, IconCamera, IconBarcode, IconUtensils, IconClock, IconX } from '../../icons';
import { mealService } from '../../api/services';
import { invalidateApiQuery } from '../../api/query';

const SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
type Slot = (typeof SLOTS)[number];

const FREQUENT: { name: string; serving: string; kcal: number; frequencyLabel?: string }[] = [
  { name: 'Bún chả',  serving: '1 bowl · ~620 kcal', kcal: 620, frequencyLabel: '3× this week' },
  { name: 'Phở bò',   serving: '1 bowl · ~540 kcal', kcal: 540, frequencyLabel: '2× this week' },
  { name: 'Cơm tấm',  serving: '1 plate · ~590 kcal', kcal: 590 },
];

const RECENT: { name: string; serving: string; kcal: number }[] = [
  { name: 'Oatmeal & berries', serving: '1 bowl · 250g', kcal: 380 },
  { name: 'Protein bar',       serving: '1 bar · 60g',   kcal: 220 },
];

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
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const SLOT_LABELS: Record<Slot, string> = {
    Breakfast: i18n('meals.breakfast'),
    Lunch:     i18n('meals.lunch'),
    Dinner:    i18n('meals.dinner'),
    Snack:     i18n('meals.snack'),
  };

  const METHOD_CARDS_TOP_I18N = [
    {
      label: i18n('meals.barcode'),
      sub: i18n('meals.packagedFoods'),
      Icon: IconBarcode,
      onPress: () => setFeedback({
        title: 'Barcode lookup unavailable',
        message: 'Use Scan with AI or manual entry until a packaged-food lookup API is available.',
      }),
    },
    {
      label: i18n('meals.manualEntry'),
      sub: i18n('meals.customDish'),
      Icon: IconUtensils,
      onPress: () => {
        setFeedback(null);
        setManualVisible(true);
      },
    },
  ];
  const METHOD_CARD_HISTORY_I18N = {
    label: i18n('meals.fromHistory'),
    sub: i18n('meals.recentMeals'),
    Icon: IconClock,
    onPress: () => setFeedback({
      title: 'Meal history reuse unavailable',
      message: 'Recent and frequent rows are read-only examples until Core exposes reusable meal history.',
    }),
  };

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

  function handleSearchSubmit() {
    if (!searchText.trim()) return;
    setFeedback({
      title: 'Food search unavailable',
      message: 'Food database search is guarded until a real lookup API exists. Manual meal entry is available.',
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

      {/* Method cards — top row 2 cards, bottom row 1 full-width */}
      <View style={styles.methodGrid}>
        {/* Top row */}
        <View style={styles.methodTopRow}>
          {METHOD_CARDS_TOP_I18N.map((m) => (
            <Pressable
              key={m.label}
              onPress={m.onPress}
              style={[styles.methodCardHalf, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg }]}
            >
              <View style={[styles.methodIconSq, { backgroundColor: t.brandSoft, borderRadius: t.radius.md }]}>
                <m.Icon size={22} color={t.brand} />
              </View>
              <Text style={[typography.bodyMed, { color: t.ink, marginTop: 8 }]}>{m.label}</Text>
              <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>{m.sub}</Text>
            </Pressable>
          ))}
        </View>
        {/* Bottom row — full-width horizontal history card */}
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
            onChangeText={setManualName}
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
        {FREQUENT.map((f) => (
          <FoodRow
            key={f.name}
            name={f.name}
            serving={f.serving}
            kcal={f.kcal}
            frequencyLabel={f.frequencyLabel}
            icon={<IconUtensils size={18} color={t.brand} />}
            showAddButton={false}
          />
        ))}
      </Card>

      {/* Recent */}
      <SectionHeader title={i18n('meals.recentlyLogged')} />
      <Card style={{ padding: 0, paddingHorizontal: 12 }}>
        {RECENT.map((f) => <FoodRow key={f.name} {...f} showAddButton={false} />)}
      </Card>
    </Screen>
  );
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
  methodTopRow:       { flexDirection: 'row', gap: 10 },
  methodCardHalf:     { flex: 1, padding: 16, borderWidth: StyleSheet.hairlineWidth },
  methodCardFull:     { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14, borderWidth: StyleSheet.hairlineWidth },
  methodCardFullText: { flex: 1 },
  methodIconSq:       { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  manualCard:         { gap: 10, marginTop: 8, marginBottom: 4 },
  manualInput:        { borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 10 },
  manualNotes:        { minHeight: 76, textAlignVertical: 'top' },
});
