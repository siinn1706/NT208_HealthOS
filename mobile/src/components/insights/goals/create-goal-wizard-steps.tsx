// Types, CATEGORIES, and WizardStep1 for CreateGoalScreen
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import {
  IconTarget, IconHeartPulse, IconMoon, IconLeaf, IconPill, IconActivity,
  IconSparkle, IconCheck,
} from '../../../icons';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Category = 'Steps' | 'Sleep' | 'Nutrition' | 'Medication' | 'Weight' | 'Custom';
export type Schedule = 'Daily' | 'Weekly' | 'Specific';

interface CategoryMeta {
  key: Category;
  label: string;
  sub: string;
  icon: (color: string) => React.ReactNode;
}

export const CATEGORIES: CategoryMeta[] = [
  { key: 'Steps',      label: 'Steps',      sub: 'Daily step count',    icon: (c) => <IconActivity   size={18} color={c} /> },
  { key: 'Sleep',      label: 'Sleep',      sub: 'Hours per night',     icon: (c) => <IconMoon       size={18} color={c} /> },
  { key: 'Nutrition',  label: 'Nutrition',  sub: 'Sodium / calories',   icon: (c) => <IconLeaf       size={18} color={c} /> },
  { key: 'Medication', label: 'Medication', sub: 'Dose adherence',      icon: (c) => <IconPill       size={18} color={c} /> },
  { key: 'Weight',     label: 'Weight',     sub: 'Target body weight',  icon: (c) => <IconHeartPulse size={18} color={c} /> },
  { key: 'Custom',     label: 'Custom',     sub: 'Any health metric',   icon: (c) => <IconTarget     size={18} color={c} /> },
];

// ─── Step 1: Category grid ────────────────────────────────────────────────────

export function WizardStep1({ value, onChange }: { value: Category | null; onChange: (c: Category) => void }) {
  const t = useTheme();
  return (
    <View style={styles.stepBody}>
      <Text style={[typography.micro, { color: t.brand, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }]}>
        STEP 1 — CATEGORY
      </Text>
      <Text style={[typography.display, { color: t.ink, marginBottom: 6, lineHeight: 32 }]}>
        What would you{'\n'}like to improve?
      </Text>

      {/* 2-column category card grid */}
      <View style={s1.grid}>
        {CATEGORIES.map((cat) => {
          const active = value === cat.key;
          const iconColor = active ? t.brand : t.ink3;
          return (
            <Pressable
              key={cat.key}
              onPress={() => onChange(cat.key)}
              style={[
                s1.card,
                {
                  borderColor: active ? t.brand : t.border,
                  borderWidth: active ? 2 : StyleSheet.hairlineWidth,
                  backgroundColor: active ? t.brandSoft : t.card,
                  borderRadius: t.radius.lg,
                },
              ]}
            >
              {/* Check badge when selected */}
              {active && (
                <View style={[s1.checkBadge, { backgroundColor: t.brand, borderRadius: 999 }]}>
                  <IconCheck size={10} color="#fff" />
                </View>
              )}
              <View style={[s1.iconTile, { backgroundColor: iconColor + '18', borderRadius: t.radius.md }]}>
                {cat.icon(iconColor)}
              </View>
              <Text style={[typography.bodyMed, { color: active ? t.brand : t.ink, marginTop: 8 }]}>{cat.label}</Text>
              <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>{cat.sub}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* AI suggests callout */}
      <View style={[s1.aiCallout, { backgroundColor: t.brandSoft, borderColor: t.brand + '30', borderRadius: t.radius.md }]}>
        <View style={[s1.aiIcon, { backgroundColor: t.brand + '18', borderRadius: t.radius.sm }]}>
          <IconSparkle size={14} color={t.brand} />
        </View>
        <Text style={[typography.caption, { color: t.ink3, flex: 1 }]}>
          AI suggests <Text style={{ color: t.brand, fontWeight: '600' }}>Steps</Text> based on your activity history
        </Text>
      </View>
    </View>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  stepBody: { flex: 1 },
});

const s1 = StyleSheet.create({
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  card:      { width: '47%', padding: 14, minHeight: 90, position: 'relative', borderWidth: StyleSheet.hairlineWidth },
  checkBadge:{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  iconTile:  { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  aiCallout: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderWidth: StyleSheet.hairlineWidth },
  aiIcon:    { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
});



