// WizardStep4 — Review & commit step for CreateGoalScreen
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { Card } from '../../primitives/card';
import { IconTarget, IconCheck } from '../../../icons';
import type { Category, Schedule } from './create-goal-wizard-steps';
import { CATEGORIES } from './create-goal-wizard-steps';

const IMPACT_ROWS = [
  { label: 'Resting HR',    delta: '-3 bpm'  },
  { label: 'Systolic BP',   delta: '-4 mmHg' },
  { label: '10-yr CV risk', delta: '-2%'     },
  { label: 'Sleep onset',   delta: '-6 min'  },
];

export function WizardStep4({
  category, target, schedule, days = [],
}: {
  category: Category | null;
  target: string;
  schedule: Schedule;
  days?: string[];
}) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [pactChecked, setPactChecked] = useState(false);
  const cat = CATEGORIES.find((c) => c.key === category);

  const cadence = days.length > 0 ? `${days.length}×/week` : `${schedule}`;
  const statGrid = [
    { label: 'Cadence',   value: cadence         },
    { label: 'Duration',  value: '4 weeks'        },
    { label: 'Reminders', value: '08:30 · 13:30'  },
    { label: 'Source',    value: 'Auto · iPhone'  },
  ];

  return (
    <View style={styles.stepBody}>
      <Text style={[typography.micro, { color: t.brand, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }]}>
        {i18n('insights.wizardStep4Label')}
      </Text>
      <Text style={[typography.display, { color: t.ink, marginBottom: 16, lineHeight: 32 }]}>
        {i18n('insights.wizardStep4Title')}
      </Text>

      {/* Summary gradient card */}
      <LinearGradient
        colors={[t.brand, t.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.gradCard, { borderRadius: t.radius.xl }]}
      >
        <View style={s.gradCardInner}>
          <View style={[s.iconTile, { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: t.radius.md }]}>
            {cat ? cat.icon('#fff') : <IconTarget size={22} color="#fff" />}
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[typography.micro, { color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 }]}>
              {category ?? 'CUSTOM'}
            </Text>
            <Text style={[typography.title, { color: '#fff', marginTop: 2 }]}>
              {parseInt(target, 10).toLocaleString()}{' '}
              {category === 'Steps' ? 'steps/day' : category === 'Sleep' ? 'hrs/night' : 'target'}
            </Text>
          </View>
        </View>

        {/* 2×2 stat grid */}
        <View style={s.statGrid}>
          {statGrid.map((item) => (
            <View key={item.label} style={[s.statCell, { backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: t.radius.sm }]}>
              <Text style={[typography.micro, { color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                {item.label}
              </Text>
              <Text style={[typography.bodyMed, { color: '#fff', marginTop: 2 }]}>{item.value}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Expected impact */}
      <Text style={[typography.bodyMed, { color: t.ink, marginTop: 16, marginBottom: 8 }]}>{i18n('insights.wizardExpectedImpact')}</Text>
      <Card tight>
        {IMPACT_ROWS.map((row, i) => (
          <View
            key={i}
            style={[
              s.impactRow,
              { borderBottomColor: t.border, borderBottomWidth: i < IMPACT_ROWS.length - 1 ? StyleSheet.hairlineWidth : 0 },
            ]}
          >
            <Text style={[typography.body, { color: t.ink, flex: 1 }]}>{row.label}</Text>
            <View style={[s.deltaChip, { backgroundColor: t.successSoft, borderRadius: t.radius.pill }]}>
              <Text style={[typography.chip, { color: t.success }]}>{row.delta}</Text>
            </View>
          </View>
        ))}
      </Card>

      {/* Pact card */}
      <Pressable
        onPress={() => setPactChecked((v) => !v)}
        style={[s.pactCard, { backgroundColor: t.card, borderColor: pactChecked ? t.brand : t.border, borderRadius: t.radius.lg }]}
      >
        <View style={[s.checkbox, { backgroundColor: pactChecked ? t.brand : 'transparent', borderColor: pactChecked ? t.brand : t.border, borderRadius: 4 }]}>
          {pactChecked && <IconCheck size={13} color="#fff" />}
        </View>
        <Text style={[typography.caption, { color: t.ink3, flex: 1, lineHeight: 18 }]}>
          {i18n('insights.wizardPactText')}{' '}
          <Text style={{ color: t.ink, fontWeight: '700' }}>{i18n('insights.wizardPactBold')}</Text>
          {' '}{i18n('insights.wizardPactSuffix')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({ stepBody: { flex: 1 } });

const s = StyleSheet.create({
  gradCard:      { padding: 16, marginBottom: 4, overflow: 'hidden' },
  gradCardInner: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  iconTile:      { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  statGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCell:      { width: '47%', padding: 10 },
  impactRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  deltaChip:     { paddingHorizontal: 10, paddingVertical: 4 },
  pactCard:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, marginTop: 12, borderWidth: 1.5 },
  checkbox:      { width: 22, height: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
