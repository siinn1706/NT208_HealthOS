import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { ApiState } from '../api/api-state';
import { IconFire } from '../../icons';
import { medicationService } from '../../api/services';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { formatTime } from '../../api/viewModels';

export function TakeMedConfirmScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
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
      <View style={[s.backdrop, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />

      <View style={[s.sheet, { backgroundColor: t.bgElev, borderTopLeftRadius: t.radius.xxl, borderTopRightRadius: t.radius.xxl }]}>
        <View style={[s.handle, { backgroundColor: t.borderStrong }]} />

        {/* Three-layer success halo */}
        <View style={[s.haloOuter, { backgroundColor: `${t.success}14` }]}>
          <View style={[s.haloMid, { backgroundColor: `${t.success}20` }]}>
            <View style={[s.haloInner, { backgroundColor: t.success }]}>
              <Check size={36} color="#fff" strokeWidth={2.5} />
            </View>
          </View>
        </View>

        {doses.isLoading && <ApiState title={i18n('api.loading')} loading />}
        {doses.error && <ApiState title={i18n('api.unavailable')} message={doses.error.message} actionLabel={i18n('common.retry')} onAction={doses.reload} />}
        {!doses.isLoading && !doses.error && !dose && (
          <ApiState title="No dose found" message="There is no scheduled occurrence for this medication today." />
        )}

        {dose && (
          <>
            <Text style={[typography.title, { color: t.ink, textAlign: 'center', marginTop: 16 }]}>
              {done ? 'Dose logged' : 'Log this dose?'}
            </Text>
            <Text style={[typography.body, { color: t.ink3, textAlign: 'center', marginTop: 6 }]}>
              {dose.plan_name} {dose.strength ?? ''}
            </Text>
            <Text style={[typography.caption, { color: t.ink4, textAlign: 'center', marginTop: 4 }]}>
              {done
                ? `Logged at ${formatTime(new Date().toISOString())}`
                : `Scheduled for ${formatTime(dose.scheduled_at)}`}
            </Text>

            {/* Streak capsule */}
            {done && (
              <View style={[s.streakCapsule, { backgroundColor: t.brandSoft }]}>
                <IconFire size={16} color={t.warning} />
                <View style={s.streakBody}>
                  <Text style={[typography.micro, { color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5 }]}>Streak</Text>
                  <Text style={[typography.bodyMed, { color: t.ink }]}>Keep it up!</Text>
                </View>
              </View>
            )}

            {error && <ApiState title="Could not log dose" message={error} />}

            <View style={s.actions}>
              {done ? (
                <>
                  <Button label={i18n('common.cancel')} variant="ghost" onPress={() => router.back()} style={s.flex} />
                  <Button label={i18n('common.done')} variant="solid" onPress={() => router.back()} style={s.flex} />
                </>
              ) : (
                <>
                  <Button label={i18n('meds.missed')} variant="ghost" onPress={() => router.back()} style={[s.flex, saving && { opacity: 0.4 }]} />
                  <Button label={saving ? '…' : i18n('common.confirm')} variant="solid" onPress={saving ? undefined : confirm} style={[s.flex, saving && { opacity: 0.4 }]} />
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
  safe:        { flex: 1, justifyContent: 'flex-end' },
  backdrop:    { ...StyleSheet.absoluteFillObject },
  sheet:       { padding: 20, paddingBottom: 36, alignItems: 'center' },
  handle:      { width: 40, height: 4, borderRadius: 2, marginBottom: 20 },
  haloOuter:   { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center' },
  haloMid:     { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  haloInner:   { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
  streakCapsule: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 100, marginTop: 16 },
  streakBody:  { gap: 1 },
  actions:     { flexDirection: 'row', gap: 10, marginTop: 24, width: '100%' },
  flex:        { flex: 1 },
});
