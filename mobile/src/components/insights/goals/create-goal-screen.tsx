// CreateGoalScreen — 4-step wizard for creating a new health goal
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../layout/Screen';
import { Button } from '../../primitives/Button';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { ChevronLeft } from '../../../icons';
import {
  type Category,
  type Schedule,
  StepDots,
  WizardStep1,
  WizardStep2,
  WizardStep3,
  WizardStep4,
} from './create-goal-wizard-steps';

export function CreateGoalScreen() {
  const t = useTheme();
  const [step, setStep]         = useState(1);
  const [category, setCategory] = useState<Category | null>(null);
  const [target, setTarget]     = useState('');
  const [schedule, setSchedule] = useState<Schedule>('Daily');
  const [days, setDays]         = useState<string[]>([]);

  const toggleDay = (d: string) =>
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);

  const canNext =
    (step === 1 && category !== null) ||
    (step === 2 && target.trim() !== '') ||
    step === 3 ||
    step === 4;

  return (
    <Screen>
      {/* BackBar */}
      <Pressable onPress={() => (step > 1 ? setStep((s) => s - 1) : router.back())} style={styles.backBar}>
        <ChevronLeft size={20} color={t.ink} />
        <Text style={[typography.bodyMed, { color: t.ink, marginLeft: 4 }]}>
          {step > 1 ? 'Back' : 'Goals'}
        </Text>
      </Pressable>

      <StepDots current={step} total={4} />

      {step === 1 && <WizardStep1 value={category} onChange={setCategory} />}
      {step === 2 && <WizardStep2 category={category} value={target} onChange={setTarget} />}
      {step === 3 && <WizardStep3 schedule={schedule} days={days} onSchedule={setSchedule} onDay={toggleDay} />}
      {step === 4 && <WizardStep4 category={category} target={target} schedule={schedule} />}

      <View style={styles.footer}>
        {step < 4 ? (
          <Button label="Next" onPress={() => setStep((s) => s + 1)} disabled={!canNext} />
        ) : (
          <Button label="Start Goal" onPress={() => router.back()} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  footer:  { paddingTop: 24 },
});
