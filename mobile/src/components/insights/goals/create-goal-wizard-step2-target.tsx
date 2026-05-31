// WizardStep2 — Target weight step for CreateGoalScreen
import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { Card } from '../../primitives/card';
import { IconCheck } from '../../../icons';
import type { Category } from './create-goal-wizard-steps';

export function WizardStep2({
  category, value, onChange,
}: {
  category: Category | null;
  value: string;
  onChange: (v: string) => void;
}) {
  const t      = useTheme();
  const { t: i18n } = useTranslation();
  const unit   = category === 'Steps' ? 'STEPS / DAY' : category === 'Sleep' ? 'HRS / NIGHT' : category === 'Weight' ? 'KG TARGET' : 'UNITS / DAY';
  const numVal = Number(value.replace(',', '.'));
  const safeNumVal = Number.isFinite(numVal) ? numVal : 0;
  const stepBy = category === 'Steps' ? 500 : 1;

  const increment = () => onChange(String(safeNumVal + stepBy));
  const decrement = () => onChange(String(Math.max(0, safeNumVal - stepBy)));

  const maxVal      = category === 'Steps' ? 20000 : category === 'Sleep' ? 12 : 200;
  const sliderPct   = Math.min(1, Math.max(0, safeNumVal / maxVal));
  const isGoodTarget = category === 'Steps' ? safeNumVal >= 7000 : category === 'Sleep' ? safeNumVal >= 7 : safeNumVal > 0;

  return (
    <View style={styles.stepBody}>
      <Text style={[typography.micro, { color: t.brand, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }]}>
        {i18n('insights.wizardStep2Label')}
      </Text>
      <Text style={[typography.display, { color: t.ink, marginBottom: 20, lineHeight: 32 }]}>
        {i18n('insights.wizardStep2Title')}
      </Text>

      <Card style={[s.targetCard, { borderColor: t.border }]}>
        <View style={s.controlRow}>
          <Pressable onPress={decrement} style={[s.ctrlBtn, { borderColor: t.border, borderRadius: t.radius.md, backgroundColor: t.card }]}>
            <Text style={[typography.h3, { color: t.ink, lineHeight: 28 }]}>−</Text>
          </Pressable>
          <View style={s.numWrap}>
            <TextInput
              accessibilityLabel={i18n('insights.wizardTargetInputLabel')}
              keyboardType="decimal-pad"
              value={value}
              onChangeText={onChange}
              style={[s.bigNumInput, { color: t.ink }]}
            />
            <Text style={[typography.micro, { color: t.brand, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }]}>{unit}</Text>
          </View>
          <Pressable onPress={increment} style={[s.ctrlBtn, { backgroundColor: t.brand, borderRadius: t.radius.md }]}>
            <Text style={[typography.h3, { color: '#fff', lineHeight: 28 }]}>+</Text>
          </Pressable>
        </View>

        {/* Decorative slider track */}
        <View style={s.sliderWrap}>
          <View style={[s.sliderTrack, { backgroundColor: t.border, borderRadius: t.radius.pill }]}>
            <View style={[s.sliderFill, { width: `${sliderPct * 100}%`, backgroundColor: t.brand, borderRadius: t.radius.pill }]} />
          </View>
          <View style={[s.sliderKnob, { left: `${sliderPct * 100}%`, borderColor: t.brand }]} />
          <View style={s.sliderLabels}>
            <Text style={[typography.micro, { color: t.ink4 }]}>0</Text>
            <Text style={[typography.micro, { color: t.ink4 }]}>{(maxVal / 2).toLocaleString()}</Text>
            <Text style={[typography.micro, { color: t.ink4 }]}>{maxVal.toLocaleString()}</Text>
          </View>
        </View>
      </Card>

      {isGoodTarget && (
        <View style={[s.hintCard, { backgroundColor: t.success + '10', borderColor: t.success + '25', borderRadius: t.radius.md }]}>
          <IconCheck size={14} color={t.success} />
          <Text style={[typography.caption, { color: t.success, marginLeft: 6 }]}>
            {i18n('insights.wizardGreatTarget')}
          </Text>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({ stepBody: { flex: 1 } });

const s = StyleSheet.create({
  targetCard:  { padding: 20, borderWidth: StyleSheet.hairlineWidth },
  controlRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  ctrlBtn:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  numWrap:     { alignItems: 'center' },
  bigNumInput: { minWidth: 120, padding: 0, fontSize: 44, fontWeight: '800', lineHeight: 50, textAlign: 'center' },
  sliderWrap:  { position: 'relative', paddingBottom: 20 },
  sliderTrack: { height: 6, width: '100%' },
  sliderFill:  { height: 6, position: 'absolute', top: 0, left: 0 },
  sliderKnob:  { position: 'absolute', top: -5, width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', borderWidth: 2.5, marginLeft: -8 },
  sliderLabels:{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  hintCard:    { flexDirection: 'row', alignItems: 'center', padding: 10, marginTop: 12, borderWidth: StyleSheet.hairlineWidth },
});
