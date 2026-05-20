// Prevention plan screen — actionable steps for cardiovascular risk reduction
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../layout/screen';
import { Card } from '../../primitives/card';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { ChevronLeft, IconFilter, IconTarget, IconLeaf, IconActivity, IconHeart, IconShield, IconAlert } from '../../../icons';

// ─── BackBar ──────────────────────────────────────────────────────────────────

function BackBar({ title }: { title: string }) {
  const t = useTheme();
  return (
    <View style={styles.backBar}>
      <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
        <ChevronLeft size={24} color={t.ink} />
      </Pressable>
      <Text style={[typography.h3, { flex: 1, color: t.ink }]} numberOfLines={1}>{title}</Text>
      <Pressable style={[styles.filterBtn, { borderColor: t.border, borderRadius: 999 }]}>
        <IconFilter size={18} color={t.ink3} />
      </Pressable>
    </View>
  );
}

// ─── Effort dots ──────────────────────────────────────────────────────────────

function EffortDots({ effort, color }: { effort: 1 | 2 | 3; color: string }) {
  return (
    <View style={effortStyles.row}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[effortStyles.dot, { backgroundColor: i <= effort ? color : 'transparent', borderColor: color }]}
        />
      ))}
    </View>
  );
}

// ─── Benefit pill ─────────────────────────────────────────────────────────────

function BenefitPill({ label }: { label: string }) {
  const t = useTheme();
  return (
    <View style={[benefitStyles.pill, { backgroundColor: t.success + '18', borderRadius: t.radius.pill }]}>
      <Text style={[typography.micro, { color: t.success }]}>{label}</Text>
    </View>
  );
}

// ─── Action item data ─────────────────────────────────────────────────────────

type Category = 'Cardiovascular' | 'Nutrition' | 'Activity' | 'Stress';
type Priority = 'HIGH' | 'MED' | 'LOW';

interface ActionItem {
  id: string;
  category: Category;
  priority: Priority;
  title: string;
  detail: string;
  duration: string;
  benefit: string;
  effort: 1 | 2 | 3;
  icon: (color: string) => React.ReactNode;
}

const INITIAL_ACTIONS: ActionItem[] = [
  {
    id: '1', category: 'Cardiovascular', priority: 'HIGH',
    title: 'Reduce sodium intake',
    detail: 'Target < 2,300 mg/day. Swap processed snacks for whole foods.',
    duration: '4 weeks', benefit: '−8 mmHg BP', effort: 2,
    icon: (c) => <IconLeaf size={18} color={c} />,
  },
  {
    id: '2', category: 'Activity', priority: 'HIGH',
    title: 'Daily 20-min walk',
    detail: 'Low-impact cardio improves BP and lowers cardiovascular risk significantly.',
    duration: '4 weeks', benefit: '−6% risk', effort: 1,
    icon: (c) => <IconActivity size={18} color={c} />,
  },
  {
    id: '3', category: 'Cardiovascular', priority: 'MED',
    title: 'Check BP twice weekly',
    detail: 'Log morning readings before medication to track trends accurately.',
    duration: '2 weeks', benefit: 'Better tracking', effort: 1,
    icon: (c) => <IconHeart size={18} color={c} />,
  },
  {
    id: '4', category: 'Nutrition', priority: 'MED',
    title: 'Mediterranean diet basics',
    detail: 'Add olive oil, legumes, fish × 2/week. Reduce red meat.',
    duration: '8 weeks', benefit: '−12% risk', effort: 3,
    icon: (c) => <IconLeaf size={18} color={c} />,
  },
  {
    id: '5', category: 'Stress', priority: 'MED',
    title: 'Limit alcohol to 1/week',
    detail: 'Excess alcohol raises BP and disrupts sleep quality.',
    duration: '4 weeks', benefit: '−5% risk', effort: 2,
    icon: (c) => <IconAlert size={18} color={c} />,
  },
  {
    id: '6', category: 'Stress', priority: 'LOW',
    title: 'Stress management',
    detail: 'Guided breathing or meditation can reduce resting heart rate.',
    duration: '8 weeks', benefit: 'Improved HRV', effort: 1,
    icon: (c) => <IconShield size={18} color={c} />,
  },
  {
    id: '7', category: 'Cardiovascular', priority: 'LOW',
    title: 'Annual cardio checkup',
    detail: 'Schedule a lipid panel + ECG with your cardiologist.',
    duration: '1 day', benefit: 'Early detection', effort: 1,
    icon: (c) => <IconTarget size={18} color={c} />,
  },
];

const ALL_CATEGORIES: Category[] = ['Cardiovascular', 'Nutrition', 'Activity', 'Stress'];

// ─── Suggestion card ──────────────────────────────────────────────────────────

function SuggestionCard({ item, started, onToggle }: { item: ActionItem; started: boolean; onToggle: () => void }) {
  const t = useTheme();
  const priorityColor = item.priority === 'HIGH' ? t.warning : item.priority === 'MED' ? t.brand : t.success;
  const iconColor = priorityColor;

  return (
    <Card style={[cardStyles.card, { borderColor: t.border }]}>
      {/* Category eyebrow */}
      <Text style={[typography.micro, { color: t.brand, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }]}>
        {item.category.toUpperCase()} · {item.priority} PRIORITY
      </Text>

      <View style={cardStyles.headerRow}>
        <View style={[cardStyles.iconTile, { backgroundColor: priorityColor + '18', borderRadius: t.radius.md }]}>
          {item.icon(iconColor)}
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[typography.h3, { color: t.ink }]}>{item.title}</Text>
        </View>
      </View>

      <Text style={[typography.body, { color: t.ink3, marginTop: 10, marginBottom: 12 }]}>{item.detail}</Text>

      {/* Divider */}
      <View style={[cardStyles.divider, { backgroundColor: t.border }]} />

      {/* Benefit row */}
      <View style={cardStyles.footerRow}>
        <BenefitPill label={item.benefit} />
        <View style={cardStyles.effortWrap}>
          <Text style={[typography.micro, { color: t.ink4, marginRight: 4 }]}>Effort</Text>
          <EffortDots effort={item.effort} color={priorityColor} />
        </View>
        <Text style={[typography.caption, { color: t.ink4 }]}>{item.duration}</Text>
        <Pressable
          onPress={onToggle}
          style={[cardStyles.startBtn, { backgroundColor: started ? t.success + '18' : t.brand, borderRadius: t.radius.pill }]}
        >
          <Text style={[typography.chip, { color: started ? t.success : '#fff' }]}>
            {started ? '✓ Started' : 'Start'}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function PreventionScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [startedIds, setStartedIds] = useState<Set<string>>(
    new Set(INITIAL_ACTIONS.filter((a) => a.priority === 'HIGH').map((a) => a.id))
  );

  const toggle = (id: string) =>
    setStartedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  const filtered = activeCategory === 'All'
    ? INITIAL_ACTIONS
    : INITIAL_ACTIONS.filter((a) => a.category === activeCategory);

  const categories: (Category | 'All')[] = ['All', ...ALL_CATEGORIES];

  return (
    <Screen>
      <BackBar title={i18n('insights.preventionTitle')} />

      {/* Filter chip bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={filterStyles.bar}>
        {categories.map((cat) => {
          const active = activeCategory === cat;
          return (
            <Pressable
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[
                filterStyles.chip,
                {
                  backgroundColor: active ? t.brand : t.card,
                  borderColor: active ? t.brand : t.border,
                  borderRadius: t.radius.pill,
                },
              ]}
            >
              <Text style={[typography.chip, { color: active ? '#fff' : t.ink3 }]}>{cat}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Cards list */}
      <View style={styles.cardList}>
        {filtered.map((item) => (
          <SuggestionCard
            key={item.id}
            item={item}
            started={startedIds.has(item.id)}
            onToggle={() => toggle(item.id)}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, minHeight: 52 },
  backBtn:   { width: 40, alignItems: 'flex-start' },
  filterBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  cardList:  { gap: 12 },
});

const filterStyles = StyleSheet.create({
  bar:  { flexDirection: 'row', gap: 8, paddingBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth },
});

const cardStyles = StyleSheet.create({
  card:       { padding: 18, borderWidth: StyleSheet.hairlineWidth },
  headerRow:  { flexDirection: 'row', alignItems: 'center' },
  iconTile:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  divider:    { height: StyleSheet.hairlineWidth, marginBottom: 10 },
  footerRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  effortWrap: { flexDirection: 'row', alignItems: 'center' },
  startBtn:   { paddingHorizontal: 12, paddingVertical: 6, marginLeft: 'auto' },
});

const effortStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5 },
});

const benefitStyles = StyleSheet.create({
  pill: { paddingHorizontal: 8, paddingVertical: 3 },
});
