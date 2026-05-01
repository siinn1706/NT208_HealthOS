import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/Button';
import { Chip } from '../primitives/Chip';
import { ApiState } from '../api/ApiState';
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
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!dose) return;
    setSaving(true);
    setError(null);
    try {
      await medicationService.markDoseDone(dose.reminder_id, dose.occurrence_id);
      invalidateApiQuery(queryKeys.medications);
      invalidateApiQuery(queryKeys.medicationDosesToday);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark dose as taken.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <View style={[s.backdrop, { backgroundColor: `${t.bg}CC` }]} />

      <View style={[s.sheet, { backgroundColor: t.bgElev, borderTopLeftRadius: t.radius.xxl, borderTopRightRadius: t.radius.xxl }]}>
        <View style={[s.handle, { backgroundColor: t.borderStrong }]} />

        {/* Success circle */}
        <View style={[s.successRing, { backgroundColor: `${t.success}18` }]}>
          <View style={[s.successInner, { backgroundColor: t.success }]}>
            <Check size={36} color="#fff" strokeWidth={2.5} />
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
              {done ? 'Dose logged!' : 'Log this dose?'}
            </Text>
            <Text style={[typography.body, { color: t.ink3, textAlign: 'center', marginTop: 6 }]}>
              {dose.plan_name} {dose.strength ?? ''}
            </Text>
            <Text style={[typography.caption, { color: t.ink4, textAlign: 'center', marginTop: 4 }]}>
              {done
                ? `Logged at ${formatTime(new Date().toISOString())}`
                : `Scheduled for ${formatTime(dose.scheduled_at)}`}
            </Text>

            {/* Streak chip (post-confirm) */}
            {done && (
              <View style={s.streakRow}>
                <Chip label="Streak" variant="success" />
                <Text style={[typography.bodyMed, { color: t.ink, marginLeft: 8 }]}>Keep it up!</Text>
              </View>
            )}

            {error && <ApiState title="Could not log dose" message={error} />}

            <View style={s.actions}>
              {done ? (
                <>
                  <Button label="Undo" variant="ghost" onPress={() => router.back()} style={s.flex} />
                  <Button label="Done" variant="solid" onPress={() => router.back()} style={s.flex} />
                </>
              ) : (
                <>
                  <Button label="Skip" variant="ghost" onPress={() => router.back()} style={[s.flex, saving && { opacity: 0.4 }]} />
                  <Button label={saving ? '…' : 'Confirm'} variant="solid" onPress={saving ? undefined : confirm} style={[s.flex, saving && { opacity: 0.4 }]} />
                </>
              )}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, justifyContent: 'flex-end' },
  backdrop:     { ...StyleSheet.absoluteFillObject },
  sheet:        { padding: 20, paddingBottom: 36, alignItems: 'center' },
  handle:       { width: 40, height: 4, borderRadius: 2, marginBottom: 20 },
  successRing:  { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  successInner: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
  streakRow:    { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  actions:      { flexDirection: 'row', gap: 10, marginTop: 24, width: '100%' },
  flex:         { flex: 1 },
});
