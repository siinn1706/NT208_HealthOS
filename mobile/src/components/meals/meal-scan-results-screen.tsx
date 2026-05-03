import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../layout/Screen';
import { Card } from '../primitives/Card';
import { Button } from '../primitives/Button';
import { ProgressRing } from '../charts/ProgressRing';
import { useTheme } from '../../theme/useTheme';
import { typography, tabularNums } from '../../theme/typography';
import { ChevronLeft, IconRefresh, IconClock, IconAlert } from '../../icons';

const MACROS = [
  { label: 'Carbs',   value: '75g',  color: '#E3B79A' },
  { label: 'Protein', value: '38g',  color: null },      // t.brand
  { label: 'Fat',     value: '22g',  color: '#5B90C4' },
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

  return (
    <Screen>
      <BackBar
        title="Confirm meal"
        onBack={() => router.back()}
        right={
          <Pressable hitSlop={8}>
            <IconRefresh size={20} color={t.ink3} />
          </Pressable>
        }
      />

      {/* Faux food photo */}
      <View style={[styles.photoCard, { backgroundColor: t.card, borderRadius: t.radius.lg, borderColor: t.border }]}>
        <View style={[styles.blob, { backgroundColor: '#5C3D20', top: 20, left: 30, width: 110, height: 80 }]} />
        <View style={[styles.blob, { backgroundColor: '#3B5E3A', top: 50, right: 40, width: 80, height: 60 }]} />
        <View style={[styles.blob, { backgroundColor: '#7A4A1E', bottom: 30, left: 60, width: 90, height: 65 }]} />
      </View>

      {/* Match header */}
      <Card tight style={styles.matchCard}>
        <View style={styles.matchRow}>
          <View style={styles.matchLeft}>
            <Text style={[typography.micro, { color: t.ink3, letterSpacing: 0.5 }]}>BEST MATCH · 94%</Text>
            <Text style={[typography.title, { color: t.ink, marginTop: 2 }]}>Bún chả Hà Nội</Text>
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
            <Text style={[typography.chip, tabularNums, { color: t.ink }]}>620</Text>
          </ProgressRing>
          <View style={styles.macroGrid}>
            {MACROS.map((m) => (
              <View key={m.label} style={styles.macroItem}>
                <View style={[styles.macroDot, { backgroundColor: m.color ?? t.brand }]} />
                <Text style={[typography.micro, { color: t.ink3 }]}>{m.label}</Text>
                <Text style={[typography.chip, tabularNums, { color: t.ink }]}>{m.value}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={[typography.micro, { color: t.ink3, marginTop: 4, textAlign: 'center' }]}>kcal estimated</Text>
      </Card>

      {/* Items detected */}
      <Text style={[typography.h3, { color: t.ink, marginTop: 16, marginBottom: 8 }]}>Items detected</Text>
      <Card style={{ padding: 0, paddingHorizontal: 12 }}>
        {DETECTED.map((item) => (
          <View key={item.name} style={[styles.detectedRow, { borderBottomColor: t.border }]}>
            <View style={styles.detectedInfo}>
              <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[typography.caption, { color: t.ink3 }]}>{item.amount}</Text>
            </View>
            <View style={styles.detectedRight}>
              {item.warn && (
                <View style={[styles.warnChip, { backgroundColor: '#FEF3C7' }]}>
                  <IconAlert size={10} color="#D97706" />
                  <Text style={[typography.micro, { color: '#D97706', marginLeft: 3 }]}>High sodium</Text>
                </View>
              )}
              <Text style={[typography.caption, tabularNums, { color: t.ink2 }]}>{item.kcal} kcal</Text>
              <Text style={[typography.micro, { color: t.ink3 }]}>{item.pct}%</Text>
            </View>
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
        <Button label="Retake" variant="ghost" style={{ flex: 1 }} onPress={() => router.push('/meals/scan' as never)} />
        <Button label="Save meal" variant="solid" style={{ flex: 2 }} onPress={() => router.push('/meals' as never)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  backBtn:      { width: 40 },
  photoCard:    { height: 160, borderWidth: StyleSheet.hairlineWidth, marginBottom: 12, overflow: 'hidden' },
  blob:         { position: 'absolute', borderRadius: 50, opacity: 0.8 },
  matchCard:    { marginBottom: 10 },
  matchRow:     { flexDirection: 'row', alignItems: 'center' },
  matchLeft:    { flex: 1 },
  changeBtn:    { paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1 },
  summaryCard:  { marginBottom: 4 },
  summaryRow:   { flexDirection: 'row', alignItems: 'center', gap: 16 },
  macroGrid:    { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  macroItem:    { alignItems: 'center', gap: 3 },
  macroDot:     { width: 8, height: 8, borderRadius: 4 },
  detectedRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  detectedInfo: { flex: 1, gap: 1 },
  detectedRight:{ alignItems: 'flex-end', gap: 3 },
  warnChip:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  slotCard:     { marginTop: 12 },
  slotRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  slotText:     { flex: 1, gap: 1 },
  btnRow:       { flexDirection: 'row', gap: 10, marginTop: 20 },
});
