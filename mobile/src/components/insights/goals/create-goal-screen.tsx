// CreateGoalScreen — 4-step wizard for creating a new health goal
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../layout/screen';
import { Button } from '../../primitives/button';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { ChevronLeft } from '../../../icons';
import { type Category, type Schedule, WizardStep1 } from './create-goal-wizard-steps';
import { WizardStep2 } from './create-goal-wizard-step2-target';
import { WizardStep3 } from './create-goal-wizard-step3-schedule';
import { WizardStep4 } from './create-goal-wizard-step4-review';

// ─── Segmented step progress bar ─────────────────────────────────────────────

function StepProgress({ current, total }: { current: number; total: number }) {
  const t = useTheme();
  return (
    <View style={progressStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            progressStyles.seg,
            { backgroundColor: i < current ? t.brand : t.border, borderRadius: t.radius.pill },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function CreateGoalScreen() {
  const t = useTheme();
  const [step, setStep]         = useState(1);
  const [category, setCategory] = useState<Category | null>(null);
  const [target, setTarget]     = useState('8000');
  const [schedule, setSchedule] = useState<Schedule>('Daily');
  const [days, setDays]         = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);

  const toggleDay = (d: string) =>
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);

  const canNext =
    (step === 1 && category !== null) ||
    (step === 2 && target.trim() !== '') ||
    step === 3 ||
    step === 4;

  const goBack = () => step > 1 ? setStep((s) => s - 1) : router.back();

  return (
    <Screen>
      {/* Header: back icon + title + step counter */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ChevronLeft size={22} color={t.ink} />
        </Pressable>
        <Text style={[typography.h3, { flex: 1, color: t.ink, textAlign: 'center' }]}>New goal</Text>
        <Text style={[typography.bodyMed, { color: t.ink3, minWidth: 40, textAlign: 'right' }]}>
          {step} / 4
        </Text>
      </View>

      {/* Segmented progress bar */}
      <StepProgress current={step} total={4} />

      {/* Step content */}
      {step === 1 && <WizardStep1 value={category} onChange={setCategory} />}
      {step === 2 && <WizardStep2 category={category} value={target} onChange={setTarget} days={days} onDay={toggleDay} />}
      {step === 3 && <WizardStep3 schedule={schedule} days={days} onSchedule={setSchedule} onDay={toggleDay} />}
      {step === 4 && <WizardStep4 category={category} target={target} schedule={schedule} days={days} />}

      {/* Footer: back + continue (step 1 has only continue) */}
      <View style={styles.footer}>
        {step > 1 && step < 4 && (
          <Button
            label="Back"
            variant="ghost"
            size="lg"
            style={styles.footerBtn}
            onPress={goBack}
          />
        )}
        {step < 4 ? (
          <Button
            label="Continue"
            variant="solid"
            size="lg"
            style={step > 1 ? styles.footerBtn : styles.footerBtnFull}
            disabled={!canNext}
            onPress={() => setStep((s) => s + 1)}
          />
        ) : (
          <Button
            label="Commit - Start tomorrow"
            variant="solid"
            size="lg"
            style={styles.footerBtnFull}
            onPress={() => router.back()}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  backBtn:       { width: 40, alignItems: 'flex-start' },
  footer:        { flexDirection: 'row', gap: 12, paddingTop: 20 },
  footerBtn:     { flex: 1 },
  footerBtnFull: { flex: 1 },
});

const progressStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginBottom: 24, marginTop: 4 },
  seg: { flex: 1, height: 4 },
});
