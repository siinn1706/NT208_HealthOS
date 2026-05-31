import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../layout/screen';
import { Button } from '../../primitives/button';
import { ApiState } from '../../api/api-state';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { ChevronLeft } from '../../../icons';
import { invalidateApiQuery } from '../../../api/query';
import { healthGoalService } from '../../../api/services/health-goal-service';
import { queryKeys } from '../../../api/queryKeys';
import { type Category, WizardStep1 } from './create-goal-wizard-steps';
import { WizardStep2 } from './create-goal-wizard-step2-target';
import { parseWeightGoalTarget } from './weight-goal-target';

const TOTAL_STEPS = 2;

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
  const { t: i18n } = useTranslation();
  const [step, setStep]         = useState(1);
  const [category, setCategory] = useState<Category | null>('Weight');
  const [target, setTarget]     = useState('70');
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const targetKg = parseWeightGoalTarget(target);
  const showTargetError = step === 2 && target.trim().length > 0 && targetKg === null;

  const canNext =
    (step === 1 && category === 'Weight') ||
    (step === 2 && targetKg !== null);

  const goBack = () => step > 1 ? setStep((s) => s - 1) : router.back();

  async function saveGoal() {
    if (targetKg === null || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await healthGoalService.upsert({ target_weight_kg: targetKg });
      invalidateApiQuery(queryKeys.healthGoal);
      router.back();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : i18n('insights.goalSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      {/* Header: back icon + title + step counter */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ChevronLeft size={22} color={t.ink} />
        </Pressable>
        <Text style={[typography.h3, { flex: 1, color: t.ink, textAlign: 'center' }]}>{i18n('insights.newGoalTitle')}</Text>
        <Text style={[typography.bodyMed, { color: t.ink3, minWidth: 40, textAlign: 'right' }]}>
          {step} / {TOTAL_STEPS}
        </Text>
      </View>

      {/* Segmented progress bar */}
      <StepProgress current={step} total={TOTAL_STEPS} />

      {/* Step content */}
      {step === 1 && <WizardStep1 value={category} onChange={setCategory} />}
      {step === 2 && <WizardStep2 category={category} value={target} onChange={(value) => { setTarget(value); setSaveError(null); }} />}

      {showTargetError && (
        <ApiState title={i18n('insights.goalTargetInvalid')} message={i18n('insights.goalTargetRange')} />
      )}
      {saveError && <ApiState title={i18n('insights.goalSaveFailed')} message={saveError} />}

      {/* Footer: back + continue (step 1 has only continue) */}
      <View style={styles.footer}>
        {step > 1 && (
          <Button
            label={i18n('common.back')}
            variant="ghost"
            size="lg"
            style={styles.footerBtn}
            onPress={goBack}
          />
        )}
        {step < TOTAL_STEPS ? (
          <Button
            label={i18n('insights.continue')}
            variant="solid"
            size="lg"
            style={step > 1 ? styles.footerBtn : styles.footerBtnFull}
            disabled={!canNext}
            onPress={() => setStep((s) => s + 1)}
          />
        ) : (
          <Button
            label={saving ? i18n('common.working') : i18n('insights.saveGoal')}
            variant="solid"
            size="lg"
            style={styles.footerBtnFull}
            onPress={saveGoal}
            disabled={!canNext || saving}
            loading={saving}
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
