import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../layout/Screen';
import { SectionHeader } from '../layout/SectionHeader';
import { Card } from '../primitives/Card';
import { MacroDonut } from './macro-donut';
import { useTheme } from '../../theme/useTheme';
import { typography, tabularNums } from '../../theme/typography';
import { ChevronLeft, IconCalendar, IconTrendUp, IconCheck, IconAlert } from '../../icons';

type Period = 'Day' | 'Week' | 'Month' | 'Year';
const PERIODS: Period[] = ['Day', 'Week', 'Month', 'Year'];

// Stub bar data — 7 days
const BAR_DATA = [1820, 2050, 1640, 1900, 1420, 1980, 1760];
const BAR_TARGET = 2100;
const BAR_MAX = Math.max(...BAR_DATA, BAR_TARGET) * 1.1;

const INSIGHTS = [
  { tone: 'success', icon: 'check', title: 'Protein improving',  body: 'You hit your protein goal 5 out of 7 days — up from 3 last week.' },
  { tone: 'warn',    icon: 'alert', title: 'Sodium too high',    body: 'Average sodium was 2,380 mg/day. Aim for under 2,300 mg.' },
  { tone: 'brand',   icon: 'trend', title: 'Calories on track',  body: 'Weekly average (1,901 kcal) is within 10% of your 2,100 kcal goal.' },
];

const TOP_FOODS = [
  { rank: 1, name: 'Bún chả',           serving: '4× this week', kcal: 620 },
  { rank: 2, name: 'Oatmeal & berries', serving: '5× this week', kcal: 380 },
  { rank: 3, name: 'Cơm tấm',           serving: '2× this week', kcal: 590 },
];

function BackBar({ title, right }: { title: string; right?: React.ReactNode }) {
  const router = useRouter();
  const t = useTheme();
  return (
    <View style={styles.backBar}>
      <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
        <ChevronLeft size={24} color={t.ink} />
      </Pressable>
      <Text style={[typography.h3, { flex: 1, color: t.ink }]}>{title}</Text>
      {right}
    </View>
  );
}

export function NutritionTrendsScreen() {
  const t = useTheme();
  const [period, setPeriod] = useState<Period>('Week');

  const donutSegments = [
    { value: 54, color: '#E3B79A' },
    { value: 26, color: t.brand   },
    { value: 20, color: '#5B90C4' },
  ];

  return (
    <Screen>
      <BackBar
        title="Nutrition trends"
        right={<Pressable hitSlop={8}><IconCalendar size={20} color={t.ink3} /></Pressable>}
      />

      {/* Period segmented control */}
      <View style={[styles.segControl, { backgroundColor: t.bgElev, borderRadius: t.radius.lg }]}>
        {PERIODS.map((p) => (
          <Pressable
            key={p}
            onPress={() => setPeriod(p)}
            style={[styles.segItem, { borderRadius: t.radius.md }, period === p && { backgroundColor: t.card }]}
          >
            <Text style={[typography.chip, { color: period === p ? t.ink : t.ink3 }]}>{p}</Text>
          </Pressable>
        ))}
      </View>

      {/* Average card + bar chart */}
      <Card tight style={styles.avgCard}>
        <View style={styles.avgRow}>
          <View>
            <Text style={[typography.micro, { color: t.ink3 }]}>WEEKLY AVERAGE</Text>
            <Text style={[typography.title, tabularNums, { color: t.ink, marginTop: 2 }]}>1,901 kcal</Text>
          </View>
          <View style={[styles.deltaBadge, { backgroundColor: t.success + '22', borderRadius: t.radius.pill }]}>
            <IconTrendUp size={12} color={t.success} />
            <Text style={[typography.micro, { color: t.success, marginLeft: 3 }]}>▼ 9% vs prev</Text>
          </View>
        </View>

        {/* Bar chart */}
        <View style={styles.barChart}>
          {BAR_DATA.map((v, i) => {
            const h = Math.max((v / BAR_MAX) * 80, 4);
            const isToday = i === 4;
            return (
              <View key={i} style={styles.barCol}>
                <View style={[styles.bar, { height: h, backgroundColor: isToday ? t.brand : t.brandSoft }]} />
                <Text style={[typography.micro, { color: t.ink3, marginTop: 3 }]}>
                  {['M','T','W','T','F','S','S'][i]}
                </Text>
              </View>
            );
          })}
          {/* Dashed target line — approximate using a thin View */}
          <View style={[styles.targetLine, {
            bottom: 18 + (BAR_TARGET / BAR_MAX) * 80,
            borderColor: t.ink3,
          }]} />
        </View>
      </Card>

      {/* Macro split */}
      <SectionHeader title="Macro split" />
      <Card tight>
        <View style={styles.macroSplit}>
          <MacroDonut segments={donutSegments} size={110} stroke={20} />
          <View style={styles.macroLegend}>
            {[
              { label: 'Carbs',   pct: 54, target: '50%', color: '#E3B79A' },
              { label: 'Protein', pct: 26, target: '25%', color: t.brand   },
              { label: 'Fat',     pct: 20, target: '25%', color: '#5B90C4' },
            ].map((m) => (
              <View key={m.label} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: m.color }]} />
                <Text style={[typography.caption, { color: t.ink2, flex: 1 }]}>{m.label}</Text>
                <Text style={[typography.chip, tabularNums, { color: t.ink }]}>{m.pct}%</Text>
                <Text style={[typography.micro, { color: t.ink3, marginLeft: 4 }]}>/ {m.target}</Text>
              </View>
            ))}
          </View>
        </View>
      </Card>

      {/* Insights */}
      <SectionHeader title="Insights" />
      {INSIGHTS.map((ins) => {
        const toneColor = ins.tone === 'success' ? t.success : ins.tone === 'warn' ? t.warning : t.brand;
        const bgColor = toneColor + '15';
        return (
          <Card key={ins.title} tight style={{ ...styles.insightCard, backgroundColor: bgColor, borderColor: toneColor + '33' }}>
            <View style={styles.insightRow}>
              {ins.icon === 'check' && <IconCheck size={16} color={toneColor} />}
              {ins.icon === 'alert' && <IconAlert size={16} color={toneColor} />}
              {ins.icon === 'trend' && <IconTrendUp size={16} color={toneColor} />}
              <View style={styles.insightText}>
                <Text style={[typography.bodyMed, { color: t.ink }]}>{ins.title}</Text>
                <Text style={[typography.caption, { color: t.ink2 }]}>{ins.body}</Text>
              </View>
            </View>
          </Card>
        );
      })}

      {/* Top foods */}
      <SectionHeader title="Top foods" />
      <Card style={{ padding: 0, paddingHorizontal: 12 }}>
        {TOP_FOODS.map((f) => (
          <View key={f.name} style={[styles.topFoodRow, { borderBottomColor: t.border }]}>
            <View style={[styles.rankBadge, { backgroundColor: t.brandSoft }]}>
              <Text style={[typography.chip, { color: t.brand }]}>{f.rank}</Text>
            </View>
            <View style={styles.topFoodInfo}>
              <Text style={[typography.bodyMed, { color: t.ink }]}>{f.name}</Text>
              <Text style={[typography.caption, { color: t.ink3 }]}>{f.serving}</Text>
            </View>
            <Text style={[typography.caption, tabularNums, { color: t.ink2 }]}>{f.kcal} kcal</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  backBtn:      { width: 40 },
  segControl:   { flexDirection: 'row', padding: 4, marginBottom: 14 },
  segItem:      { flex: 1, alignItems: 'center', paddingVertical: 8 },
  avgCard:      { marginBottom: 4 },
  avgRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  deltaBadge:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5 },
  barChart:     { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 6, position: 'relative' },
  barCol:       { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 98 },
  bar:          { width: '100%', borderRadius: 4 },
  targetLine:   { position: 'absolute', left: 0, right: 0, height: 1, borderWidth: 1, borderStyle: 'dashed' },
  macroSplit:   { flexDirection: 'row', alignItems: 'center', gap: 20 },
  macroLegend:  { flex: 1, gap: 10 },
  legendRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:    { width: 10, height: 10, borderRadius: 5 },
  insightCard:  { marginBottom: 8, borderWidth: 1 },
  insightRow:   { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  insightText:  { flex: 1, gap: 3 },
  topFoodRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  rankBadge:    { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  topFoodInfo:  { flex: 1, gap: 2 },
});
