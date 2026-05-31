// Prevention plan screen backed by Core risk-prediction tips.
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../layout/screen';
import { Card } from '../../primitives/card';
import { ApiState } from '../../api/api-state';
import { useApiQuery } from '../../../api/query';
import { queryKeys } from '../../../api/queryKeys';
import { riskService } from '../../../api/services';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { ChevronLeft, IconFilter, IconLeaf, IconActivity, IconHeart, IconAlert } from '../../../icons';

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

function BackBar({ title, onFilterPress }: { title: string; onFilterPress: () => void }) {
  const t = useTheme();
  return (
    <View style={styles.backBar}>
      <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
        <ChevronLeft size={24} color={t.ink} />
      </Pressable>
      <Text style={[typography.h3, { flex: 1, color: t.ink }]} numberOfLines={1}>{title}</Text>
      <Pressable
        onPress={onFilterPress}
        style={[styles.filterBtn, { borderColor: t.border, borderRadius: 999 }]}
        accessibilityRole="button"
        accessibilityLabel="Filter prevention actions"
      >
        <IconFilter size={18} color={t.ink3} />
      </Pressable>
    </View>
  );
}

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

function BenefitPill({ label }: { label: string }) {
  const t = useTheme();
  return (
    <View style={[benefitStyles.pill, { backgroundColor: t.success + '18', borderRadius: t.radius.pill }]}>
      <Text style={[typography.micro, { color: t.success }]}>{label}</Text>
    </View>
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function humanize(value: string) {
  return value.replace(/[_-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function categoryForText(value: string): Category {
  const lower = value.toLowerCase();
  if (lower.includes('step') || lower.includes('activity') || lower.includes('walk')) return 'Activity';
  if (lower.includes('diet') || lower.includes('sodium') || lower.includes('nutrition') || lower.includes('weight') || lower.includes('bmi')) return 'Nutrition';
  if (lower.includes('sleep') || lower.includes('stress') || lower.includes('alcohol')) return 'Stress';
  return 'Cardiovascular';
}

function priorityFrom(value: unknown): Priority {
  const raw = asString(value, 'medium').toLowerCase();
  if (raw === 'high') return 'HIGH';
  if (raw === 'low') return 'LOW';
  return 'MED';
}

function NutritionActionIcon(color: string) {
  return <IconLeaf size={18} color={color} />;
}

function ActivityActionIcon(color: string) {
  return <IconActivity size={18} color={color} />;
}

function StressActionIcon(color: string) {
  return <IconAlert size={18} color={color} />;
}

function CardiovascularActionIcon(color: string) {
  return <IconHeart size={18} color={color} />;
}

function iconForCategory(category: Category) {
  if (category === 'Nutrition') return NutritionActionIcon;
  if (category === 'Activity') return ActivityActionIcon;
  if (category === 'Stress') return StressActionIcon;
  return CardiovascularActionIcon;
}

function riskTipsToActions(payload: unknown): ActionItem[] {
  const risks = asArray(asRecord(payload).risks).map(asRecord);
  return risks.flatMap((risk, riskIndex) => {
    const condition = humanize(asString(risk.condition, 'Risk'));
    const level = humanize(asString(risk.level, 'unknown'));
    const probability = Math.round(asNumber(risk.probability) * 100);
    const tips = asArray(risk.tips).map(asRecord);
    return tips.map((tip, tipIndex) => {
      const title = humanize(asString(tip.title, 'Prevention action'));
      const detail = humanize(asString(tip.description, 'No action detail returned by Core.'));
      const category = categoryForText(`${condition} ${title} ${detail}`);
      const priority = priorityFrom(tip.priority);
      return {
        id: `${asString(risk.id, `risk-${riskIndex}`)}-${tipIndex}`,
        category,
        priority,
        title,
        detail,
        duration: 'Core recommendation',
        benefit: `${level} · ${probability}%`,
        effort: priority === 'HIGH' ? 2 : priority === 'MED' ? 2 : 1,
        icon: iconForCategory(category),
      };
    });
  });
}

function SuggestionCard({ item, onTrack }: { item: ActionItem; onTrack: () => void }) {
  const t = useTheme();
  const priorityColor = item.priority === 'HIGH' ? t.warning : item.priority === 'MED' ? t.brand : t.success;

  return (
    <Card style={[cardStyles.card, { borderColor: t.border }]}>
      <Text style={[typography.micro, { color: t.brand, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }]}>
        {item.category.toUpperCase()} · {item.priority} PRIORITY
      </Text>

      <View style={cardStyles.headerRow}>
        <View style={[cardStyles.iconTile, { backgroundColor: priorityColor + '18', borderRadius: t.radius.md }]}>
          {item.icon(priorityColor)}
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[typography.h3, { color: t.ink }]}>{item.title}</Text>
        </View>
      </View>

      <Text style={[typography.body, { color: t.ink3, marginTop: 10, marginBottom: 12 }]}>{item.detail}</Text>

      <View style={[cardStyles.divider, { backgroundColor: t.border }]} />

      <View style={cardStyles.footerRow}>
        <BenefitPill label={item.benefit} />
        <View style={cardStyles.effortWrap}>
          <Text style={[typography.micro, { color: t.ink4, marginRight: 4 }]}>Effort</Text>
          <EffortDots effort={item.effort} color={priorityColor} />
        </View>
        <Text style={[typography.caption, { color: t.ink4 }]}>{item.duration}</Text>
        <Pressable
          onPress={onTrack}
          style={[cardStyles.startBtn, { backgroundColor: t.brandSoft, borderRadius: t.radius.pill }]}
        >
          <Text style={[typography.chip, { color: t.brand }]}>Track unavailable</Text>
        </Pressable>
      </View>
    </Card>
  );
}

export function PreventionScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [feedback, setFeedback] = useState<string | null>(null);
  const loadRisk = useCallback(() => riskService.summary(), []);
  const risk = useApiQuery(queryKeys.riskSummary, loadRisk);

  const actions = useMemo(() => riskTipsToActions(risk.data), [risk.data]);
  const categories = useMemo<(Category | 'All')[]>(() => {
    const seen = new Set<Category>();
    actions.forEach((action) => seen.add(action.category));
    return ['All', ...Array.from(seen)];
  }, [actions]);
  const filtered = activeCategory === 'All'
    ? actions
    : actions.filter((action) => action.category === activeCategory);

  return (
    <Screen>
      <BackBar
        title={i18n('insights.preventionTitle')}
        onFilterPress={() => setFeedback('Use the category chips below. Saved prevention-action tracking needs a Core API contract first.')}
      />

      {risk.isLoading && <ApiState title={i18n('api.loading')} loading />}
      {risk.error && (
        <ApiState
          title="Prevention plan unavailable"
          message={risk.error.message}
          actionLabel={i18n('common.retry')}
          onAction={risk.reload}
        />
      )}
      {feedback && (
        <ApiState
          title="Prevention tracking unavailable"
          message={feedback}
          actionLabel={i18n('common.close')}
          onAction={() => setFeedback(null)}
        />
      )}

      {!risk.isLoading && !risk.error && actions.length === 0 && (
        <ApiState title="No prevention actions" message="Core risk predictions did not return prevention tips yet." />
      )}

      {!risk.isLoading && !risk.error && actions.length > 0 && (
        <>
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

          <View style={styles.cardList}>
            {filtered.map((item) => (
              <SuggestionCard
                key={item.id}
                item={item}
                onTrack={() => setFeedback('This recommendation is from Core risk predictions. It is not marked started because no saved prevention-action contract exists yet.')}
              />
            ))}
          </View>
        </>
      )}
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
