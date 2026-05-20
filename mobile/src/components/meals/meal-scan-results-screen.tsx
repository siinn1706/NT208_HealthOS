import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../layout/screen';
import { Card } from '../primitives/card';
import { Button } from '../primitives/button';
import { IconButton } from '../primitives/icon-button';
import { ProgressRing } from '../charts/progress-ring';
import { useTheme } from '../../theme/useTheme';
import { typography, tabularNums } from '../../theme/typography';
import { ChevronLeft, ChevronRight, IconRefresh, IconClock, IconAlert } from '../../icons';

const MACROS = [
  { label: 'Carbs',   value: 75,  unit: 'g', color: '#E3B79A' },
  { label: 'Protein', value: 38,  unit: 'g', color: null },      // t.brand
  { label: 'Fat',     value: 22,  unit: 'g', color: '#5B90C4' },
];

const DETECTED = [
  { name: 'Bún (rice noodles)', amount: '200g', kcal: 260, pct: 42, warn: false },
  { name: 'Chả (pork patty)',   amount: '100g', kcal: 220, pct: 35, warn: false },
  { name: 'Nước chấm (sauce)',  amount: '40ml', kcal:  80, pct: 13, warn: true  },
  { name: 'Rau sống (herbs)',   amount: '30g',  kcal:  20, pct:  3, warn: false },
];

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
          />
        }
      />

      {/* Warm food photo card — dark bg with plate */}
      <View style={[styles.photoCard, { borderRadius: t.radius.lg, borderColor: t.border }]}>
        {/* Cream plate with food blobs */}
        <View style={styles.plateCircle}>
          {/* Pork blob */}
          <View style={[styles.blob, { backgroundColor: '#8B4513', width: 110, height: 70, top: 30, left: 55 }]} />
          {/* Noodles blob */}
          <View style={[styles.blob, { backgroundColor: '#D4C5A0', width: 100, height: 45, top: 75, left: 45 }]} />
          {/* Herb blob */}
          <View style={[styles.blob, { backgroundColor: '#4A7C59', width: 70, height: 55, top: 55, right: 15 }]} />
        </View>
        {/* Detected pill */}
        <View style={styles.detectedPill}>
          <Text style={[typography.micro, { color: '#fff' }]}>✦ Detected</Text>
        </View>
      </View>

      {/* Match header */}
      <Card tight style={styles.matchCard}>
        <View style={styles.matchRow}>
          <View style={styles.matchLeft}>
            <Text style={[typography.micro, { color: t.ink3, letterSpacing: 0.5 }]}>BEST MATCH · 94%</Text>
            <Text style={[typography.title, { color: t.ink, marginTop: 2 }]}>Bún chả Hà Nội</Text>
            {/* Subtitle */}
            <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>Grilled pork, rice noodles, herbs</Text>
          </View>
          <Pressable style={[styles.changeBtn, { borderColor: t.border, borderRadius: t.radius.pill }]}>
            <Text style={[typography.chip, { color: t.ink2 }]}>Change</Text>
          </Pressable>
        </View>
      </Card>

      {/* Calorie summary */}
      <Card tight style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <ProgressRing value={620 / 2100} size={60} stroke={6} color={t.brand} track={t.border}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[typography.chip, tabularNums, { color: t.ink }]}>620</Text>
              <Text style={[typography.micro, { color: t.ink3 }]}>KCAL</Text>
            </View>
          </ProgressRing>
          <View style={styles.macroGrid}>
            {MACROS.map((m) => (
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
        {DETECTED.map((item) => (
          <View key={item.name} style={[styles.detectedRow, { borderBottomColor: t.border }]}>
            <View style={styles.detectedInfo}>
              <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[typography.caption, { color: t.ink3 }]}>
                {item.amount} · {item.kcal} kcal · {item.pct}% match
              </Text>
            </View>
            <View style={styles.detectedRight}>
              {item.warn && (
                <View style={[styles.warnChip, { backgroundColor: '#FEF3C7' }]}>
                  <IconAlert size={10} color="#D97706" />
                  <Text style={[typography.micro, { color: '#D97706', marginLeft: 3 }]}>Low confidence</Text>
                </View>
              )}
            </View>
            <ChevronRight size={16} color={t.ink3} />
          </View>
        ))}
      </Card>

      {/* Slot picker */}
      <Card tight style={styles.slotCard}>
        <View style={styles.slotRow}>
          <IconClock size={16} color={t.ink3} />
          <View style={styles.slotText}>
            <Text style={[typography.micro, { color: t.ink3 }]}>Add to</Text>
            <Text style={[typography.bodyMed, { color: t.ink }]}>Lunch · today, 12:15</Text>
          </View>
          <Text style={[typography.caption, { color: t.brand }]}>Change</Text>
        </View>
      </Card>

      {/* Action buttons */}
      <View style={styles.btnRow}>
        <Button label={i18n('meals.retake')} variant="ghost" style={{ flex: 1 }} onPress={() => router.push('/meals/scan' as never)} />
        <Button label={i18n('meals.addToLog')} variant="solid" style={{ flex: 2 }} onPress={() => router.push('/meals' as never)} />
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
