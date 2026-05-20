import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../layout/screen';
import { SectionHeader } from '../layout/section-header';
import { Card } from '../primitives/card';
import { IconButton } from '../primitives/icon-button';
import { FoodRow } from './food-row';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { ChevronLeft, IconSearch, IconCamera, IconBarcode, IconUtensils, IconClock, IconX } from '../../icons';

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

// Method cards: top row (2), bottom row (1 full-width)
const METHOD_CARDS_TOP = [
  { label: 'Barcode',       sub: 'Packaged foods', Icon: IconBarcode,  route: '/meals/scan' },
  { label: 'Manual entry',  sub: 'Custom dish',    Icon: IconUtensils, route: '/meals/add'  },
];
const METHOD_CARD_HISTORY = { label: 'From history', sub: 'Recent meals', Icon: IconClock, route: '/meals/add' };

export function AddMealScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const router = useRouter();
  const [slot, setSlot] = useState<Slot>('Lunch');

  const SLOT_LABELS: Record<Slot, string> = {
    Breakfast: i18n('meals.breakfast'),
    Lunch:     i18n('meals.lunch'),
    Dinner:    i18n('meals.dinner'),
    Snack:     i18n('meals.snack'),
  };

  const METHOD_CARDS_TOP_I18N = [
    { label: i18n('meals.barcode'),      sub: i18n('meals.packagedFoods'), Icon: IconBarcode,  route: '/meals/scan' },
    { label: i18n('meals.manualEntry'),  sub: i18n('meals.customDish'),    Icon: IconUtensils, route: '/meals/add'  },
  ];
  const METHOD_CARD_HISTORY_I18N = { label: i18n('meals.fromHistory'), sub: i18n('meals.recentMeals'), Icon: IconClock, route: '/meals/add' };

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
              onPress={() => router.push(m.route as never)}
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
          onPress={() => router.push(METHOD_CARD_HISTORY_I18N.route as never)}
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
          />
        ))}
      </Card>

      {/* Recent */}
      <SectionHeader title={i18n('meals.recentlyLogged')} />
      <Card style={{ padding: 0, paddingHorizontal: 12 }}>
        {RECENT.map((f) => <FoodRow key={f.name} {...f} />)}
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
});
