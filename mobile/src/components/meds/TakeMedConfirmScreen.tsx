import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/Button';
import { ApiState } from '../api/ApiState';
import { IconPill } from '../../icons';
import { medicationService } from '../../api/services';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { formatTime } from '../../api/viewModels';

export function TakeMedConfirmScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const medicationId = (Array.isArray(id) ? id[0] : id) ?? '';
  const loadDoses = useCallback(() => medicationService.today(), []);
  const doses = useApiQuery(queryKeys.medicationDosesToday, loadDoses);
  const dose = doses.data?.find((item) => item.medication_plan_id === medicationId) ?? null;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!dose) return;
    setSaving(true);
    setError(null);
    try {
      await medicationService.markDoseDone(dose.reminder_id, dose.occurrence_id);
      invalidateApiQuery(queryKeys.medications);
      invalidateApiQuery(queryKeys.medicationDosesToday);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark dose as taken.');
    } finally {
      setSaving(false);
    }
  }

  async function skip() {
    if (!dose) return;
    setSaving(true);
    setError(null);
    try {
      await medicationService.skipDose(dose.reminder_id, dose.occurrence_id);
      invalidateApiQuery(queryKeys.medications);
      invalidateApiQuery(queryKeys.medicationDosesToday);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not skip dose.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <View style={[s.backdrop, { backgroundColor: `${t.bg}CC` }]} />

      <View style={[s.sheet, { backgroundColor: t.bgElev, borderTopLeftRadius: t.radius.xxl, borderTopRightRadius: t.radius.xxl }]}>
        <View style={[s.handle, { backgroundColor: t.borderStrong }]} />

        <View style={[s.iconWrap, { backgroundColor: `${t.success}22`, borderRadius: 44 }]}>
          <View style={[s.iconInner, { backgroundColor: `${t.success}18`, borderRadius: 36 }]}>
            <IconPill size={44} color={t.success} strokeWidth={1.5} />
          </View>
        </View>

        {doses.isLoading && <ApiState title="Loading dose" loading />}
        {doses.error && <ApiState title="Dose unavailable" message={doses.error.message} actionLabel="Retry" onAction={doses.reload} />}
        {!doses.isLoading && !doses.error && !dose && (
          <ApiState title="No dose found" message="There is no scheduled occurrence for this medication today." />
        )}

        {dose && (
          <>
            <Text style={[typography.title, { color: t.ink, textAlign: 'center', marginTop: 16 }]}>
              Log this dose?
            </Text>
            <Text style={[typography.body, { color: t.ink3, textAlign: 'center', marginTop: 6 }]}>
              {dose.plan_name} {dose.strength ?? ''}
            </Text>
            <Text style={[typography.caption, { color: t.ink4, textAlign: 'center', marginTop: 4 }]}>
              Scheduled for {formatTime(dose.scheduled_at)}
            </Text>

            {error && <ApiState title="Could not log dose" message={error} />}

            <View style={s.actions}>
              <Button label="Skip" variant="ghost" onPress={saving ? undefined : skip} style={[s.flex, saving && { opacity: 0.4 }]} />
              <Button label={saving ? '...' : 'Confirm'} variant="solid" onPress={saving ? undefined : confirm} style={[s.flex, saving && { opacity: 0.4 }]} />
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, justifyContent: 'flex-end' },
  backdrop:  { ...StyleSheet.absoluteFillObject },
  sheet:     { padding: 20, paddingBottom: 32, alignItems: 'center' },
  handle:    { width: 40, height: 4, borderRadius: 2, marginBottom: 18 },
  iconWrap:  { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  iconInner: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  actions:   { flexDirection: 'row', gap: 10, marginTop: 24, width: '100%' },
  flex:      { flex: 1 },
});
