import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Card } from '../../primitives/card';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { IconLeaf, IconActivity, IconHeart, IconAlert } from '../../../icons';
import type { PreventionAction, PreventionCategory } from './prevention-action-derivation';

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

function iconForCategory(category: PreventionCategory, color: string) {
  if (category === 'Nutrition') return <IconLeaf size={18} color={color} />;
  if (category === 'Activity') return <IconActivity size={18} color={color} />;
  if (category === 'Stress') return <IconAlert size={18} color={color} />;
  return <IconHeart size={18} color={color} />;
}

export function PreventionSuggestionCard({
  item,
  tracked,
  saving,
  disabled = false,
  onTrack,
}: {
  item: PreventionAction;
  tracked: boolean;
  saving: boolean;
  disabled?: boolean;
  onTrack: () => void;
}) {
  const t = useTheme();
  const priorityColor = item.priority === 'HIGH' ? t.warning : item.priority === 'MED' ? t.brand : t.success;

  return (
    <Card style={[styles.card, { borderColor: t.border }]}>
      <Text style={[typography.micro, { color: t.brand, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }]}>
        {item.category.toUpperCase()} - {item.priority} PRIORITY
      </Text>

      <View style={styles.headerRow}>
        <View style={[styles.iconTile, { backgroundColor: priorityColor + '18', borderRadius: t.radius.md }]}>
          {iconForCategory(item.category, priorityColor)}
        </View>
        <View style={styles.titleWrap}>
          <Text style={[typography.h3, { color: t.ink }]}>{item.title}</Text>
        </View>
      </View>

      <Text style={[typography.body, { color: t.ink3, marginTop: 10, marginBottom: 12 }]}>{item.detail}</Text>

      <View style={[styles.divider, { backgroundColor: t.border }]} />

      <View style={styles.footerRow}>
        <BenefitPill label={item.benefit} />
        <View style={styles.effortWrap}>
          <Text style={[typography.micro, { color: t.ink4, marginRight: 4 }]}>Effort</Text>
          <EffortDots effort={item.effort} color={priorityColor} />
        </View>
        <Text style={[typography.caption, { color: t.ink4 }]}>{item.duration}</Text>
        <Pressable
          onPress={onTrack}
          disabled={tracked || saving || disabled}
          style={[
            styles.startBtn,
            {
              backgroundColor: tracked ? t.successSoft : t.brandSoft,
              borderRadius: t.radius.pill,
              opacity: saving || disabled ? 0.6 : 1,
            },
          ]}
        >
          <Text style={[typography.chip, { color: tracked ? t.success : t.brand }]}>
            {tracked ? 'Started' : saving ? 'Saving' : 'Start'}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card:       { padding: 18, borderWidth: StyleSheet.hairlineWidth },
  headerRow:  { flexDirection: 'row', alignItems: 'center' },
  iconTile:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  titleWrap:  { flex: 1, marginLeft: 10 },
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
