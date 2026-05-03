import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../layout/Screen';
import { SectionHeader } from '../layout/SectionHeader';
import { Card } from '../primitives/Card';
import { FoodRow } from './food-row';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { ChevronLeft, IconSearch, IconCamera, IconBarcode, IconUtensils, IconClock } from '../../icons';

const SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
type Slot = (typeof SLOTS)[number];

const FREQUENT: { name: string; serving: string; kcal: number }[] = [
  { name: 'Bún chả',   serving: '1 bowl · 400g',  kcal: 620 },
  { name: 'Phở bò',    serving: '1 bowl · 450g',  kcal: 540 },
  { name: 'Cơm tấm',   serving: '1 plate · 350g', kcal: 590 },
];

const RECENT: { name: string; serving: string; kcal: number }[] = [
  { name: 'Oatmeal & berries', serving: '1 bowl · 250g', kcal: 380 },
  { name: 'Protein bar',       serving: '1 bar · 60g',   kcal: 220 },
];

function BackBar({ title }: { title: string }) {
  const router = useRouter();
  const t = useTheme();
  return (
    <View style={styles.backBar}>
      <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
        <ChevronLeft size={24} color={t.ink} />
      </Pressable>
      <Text style={[typography.h3, { flex: 1, color: t.ink }]}>{title}</Text>
    </View>
  );
}

export function AddMealScreen() {
  const t = useTheme();
  const router = useRouter();
  const [slot, setSlot] = useState<Slot>('Lunch');

  return (
    <Screen>
      <BackBar title="Add meal" />

      {/* Slot picker */}
      <View style={styles.slotGrid}>
        {SLOTS.map((s) => (
          <Pressable
            key={s}
            onPress={() => setSlot(s)}
            style={[
              styles.slotChip,
              {
                backgroundColor: slot === s ? t.brand : t.card,
                borderColor: slot === s ? t.brand : t.border,
                borderRadius: t.radius.md,
              },
            ]}
          >
            <Text style={[typography.chip, { color: slot === s ? '#fff' : t.ink2 }]}>{s}</Text>
          </Pressable>
        ))}
      </View>

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.pill }]}>
        <IconSearch size={16} color={t.ink3} />
        <TextInput
          style={[typography.body, styles.searchInput, { color: t.ink }]}
          placeholder="Search foods, dishes…"
          placeholderTextColor={t.ink3}
        />
      </View>

      {/* Method cards */}
      {/* Hero — AI scan */}
      <Pressable
        onPress={() => router.push('/meals/scan' as never)}
        style={[styles.heroMethod, { backgroundColor: t.brand, borderRadius: t.radius.xl }]}
      >
        <View style={[styles.newBadge, { backgroundColor: '#fff' }]}>
          <Text style={[typography.micro, { color: t.brand }]}>NEW</Text>
        </View>
        <View style={[styles.methodIconCircle, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
          <IconCamera size={28} color="#fff" />
        </View>
        <Text style={[typography.h3, { color: '#fff', marginTop: 10 }]}>Scan with AI</Text>
        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.75)' }]}>Snap your plate</Text>
      </Pressable>

      {/* 3-col method row */}
      <View style={styles.methodRow}>
        {[
          { label: 'Barcode',  icon: <IconBarcode  size={22} color={t.brand} />, route: '/meals/scan' },
          { label: 'Manual',   icon: <IconUtensils size={22} color={t.brand} />, route: '/meals/add'  },
          { label: 'History',  icon: <IconClock    size={22} color={t.brand} />, route: '/meals/add'  },
        ].map((m) => (
          <Pressable
            key={m.label}
            onPress={() => router.push(m.route as never)}
            style={[styles.methodCard, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg }]}
          >
            <View style={[styles.methodIconSm, { backgroundColor: t.brandSoft }]}>{m.icon}</View>
            <Text style={[typography.caption, { color: t.ink, marginTop: 6 }]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Frequent */}
      <SectionHeader title="Frequent for lunch" />
      <Card style={{ padding: 0, paddingHorizontal: 12 }}>
        {FREQUENT.map((f) => <FoodRow key={f.name} {...f} />)}
      </Card>

      {/* Recent */}
      <SectionHeader title="Recently logged" />
      <Card style={{ padding: 0, paddingHorizontal: 12 }}>
        {RECENT.map((f) => <FoodRow key={f.name} {...f} />)}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  backBtn:       { width: 40 },
  slotGrid:      { flexDirection: 'row', gap: 8, marginBottom: 14 },
  slotChip:      { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 1 },
  searchBar:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, marginBottom: 16, gap: 8 },
  searchInput:   { flex: 1, padding: 0 },
  heroMethod:    { alignItems: 'center', paddingVertical: 28, marginBottom: 10, overflow: 'hidden' },
  newBadge:      { position: 'absolute', top: 12, right: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  methodIconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  methodRow:     { flexDirection: 'row', gap: 10, marginBottom: 4 },
  methodCard:    { flex: 1, alignItems: 'center', paddingVertical: 16, borderWidth: StyleSheet.hairlineWidth },
  methodIconSm:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
