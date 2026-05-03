// Wizard step components for CreateGoalScreen (Steps 1-4)
import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Category = 'Steps' | 'Sleep' | 'Nutrition' | 'Medication' | 'Custom';
export type Schedule = 'Daily' | 'Weekly' | 'Specific';

export const CATEGORIES: { key: Category; emoji: string; unit: string }[] = [
  { key: 'Steps',      emoji: '👟', unit: 'steps' },
  { key: 'Sleep',      emoji: '🌙', unit: 'hours' },
  { key: 'Nutrition',  emoji: '🥗', unit: 'mg'    },
  { key: 'Medication', emoji: '💊', unit: 'doses'  },
  { key: 'Custom',     emoji: '🎯', unit: 'units'  },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SCHEDULES: Schedule[] = ['Daily', 'Weekly', 'Specific'];

// ─── Step dots indicator ──────────────────────────────────────────────────────

export function StepDots({ current, total }: { current: number; total: number }) {
  const t = useTheme();
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: i < current ? t.brand : t.border, borderRadius: 999 }]} />
      ))}
    </View>
  );
}

// ─── Step 1: Category ─────────────────────────────────────────────────────────

export function WizardStep1({ value, onChange }: { value: Category | null; onChange: (c: Category) => void }) {
  const t = useTheme();
  return (
    <View style={styles.stepBody}>
      <Text style={[typography.title, { color: t.ink, marginBottom: 8 }]}>Choose a category</Text>
      <Text style={[typography.body, { color: t.ink3, marginBottom: 24 }]}>What type of goal do you want to track?</Text>
      <View style={styles.chipGrid}>
        {CATEGORIES.map((cat) => {
          const active = value === cat.key;
          return (
            <Pressable
              key={cat.key}
              onPress={() => onChange(cat.key)}
              style={[styles.categoryChip, { borderColor: active ? t.brand : t.border, backgroundColor: active ? t.brandSoft : t.card, borderRadius: t.radius.lg }]}
            >
              <Text style={styles.catEmoji}>{cat.emoji}</Text>
              <Text style={[typography.bodyMed, { color: active ? t.brand : t.ink, marginTop: 6 }]}>{cat.key}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Step 2: Target ───────────────────────────────────────────────────────────

export function WizardStep2({ category, value, onChange }: { category: Category | null; value: string; onChange: (v: string) => void }) {
  const t = useTheme();
  const unit = CATEGORIES.find((c) => c.key === category)?.unit ?? 'units';
  return (
    <View style={styles.stepBody}>
      <Text style={[typography.title, { color: t.ink, marginBottom: 8 }]}>Set your target</Text>
      <Text style={[typography.body, { color: t.ink3, marginBottom: 24 }]}>How much do you aim to achieve?</Text>
      <View style={[styles.inputRow, { borderColor: t.border, borderRadius: t.radius.md, backgroundColor: t.card }]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={t.ink4}
          style={[typography.title, { color: t.ink, flex: 1, padding: 0 }]}
        />
        <Text style={[typography.bodyMed, { color: t.ink3, marginLeft: 8 }]}>{unit}</Text>
      </View>
    </View>
  );
}

// ─── Step 3: Schedule ─────────────────────────────────────────────────────────

export function WizardStep3({ schedule, days, onSchedule, onDay }: {
  schedule: Schedule; days: string[]; onSchedule: (s: Schedule) => void; onDay: (d: string) => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.stepBody}>
      <Text style={[typography.title, { color: t.ink, marginBottom: 8 }]}>Set a schedule</Text>
      <Text style={[typography.body, { color: t.ink3, marginBottom: 24 }]}>How often do you want to track this goal?</Text>
      {SCHEDULES.map((opt) => {
        const active = schedule === opt;
        return (
          <Pressable key={opt} onPress={() => onSchedule(opt)}
            style={[styles.scheduleRow, { borderColor: active ? t.brand : t.border, backgroundColor: active ? t.brandSoft : t.card, borderRadius: t.radius.md }]}
          >
            <Text style={[typography.bodyMed, { color: active ? t.brand : t.ink }]}>{opt}</Text>
          </Pressable>
        );
      })}
      {schedule === 'Specific' && (
        <View style={styles.daysRow}>
          {DAYS.map((d) => {
            const sel = days.includes(d);
            return (
              <Pressable key={d} onPress={() => onDay(d)}
                style={[styles.dayChip, { backgroundColor: sel ? t.brand : t.card, borderColor: sel ? t.brand : t.border, borderRadius: t.radius.sm }]}
              >
                <Text style={[typography.chip, { color: sel ? '#fff' : t.ink3 }]}>{d}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Step 4: Confirm ─────────────────────────────────────────────────────────

export function WizardStep4({ category, target, schedule }: { category: Category | null; target: string; schedule: Schedule }) {
  const t = useTheme();
  const cat = CATEGORIES.find((c) => c.key === category);
  return (
    <View style={styles.stepBody}>
      <Text style={[typography.title, { color: t.ink, marginBottom: 8 }]}>Looks good!</Text>
      <Text style={[typography.body, { color: t.ink3, marginBottom: 24 }]}>Review your new goal before starting.</Text>
      <View style={[styles.summaryCard, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.xl }]}>
        <Text style={styles.sumEmoji}>{cat?.emoji ?? '🎯'}</Text>
        <Text style={[typography.h3, { color: t.ink, marginTop: 12 }]}>{category ?? 'Custom goal'}</Text>
        <Text style={[typography.body, { color: t.ink3, marginTop: 4 }]}>Target: {target || '—'} {cat?.unit ?? 'units'}</Text>
        <Text style={[typography.body, { color: t.ink3, marginTop: 2 }]}>Schedule: {schedule}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dotsRow:      { flexDirection: 'row', gap: 8, marginBottom: 28, marginTop: 8 },
  dot:          { width: 8, height: 8 },
  stepBody:     { flex: 1 },
  chipGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryChip: { width: '45%', padding: 16, alignItems: 'center', borderWidth: 1.5 },
  catEmoji:     { fontSize: 28 },
  inputRow:     { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1.5 },
  scheduleRow:  { padding: 16, marginBottom: 10, borderWidth: 1.5 },
  daysRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  dayChip:      { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  summaryCard:  { padding: 24, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  sumEmoji:     { fontSize: 40 },
});
