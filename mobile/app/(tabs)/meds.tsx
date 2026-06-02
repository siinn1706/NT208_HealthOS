import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/layout/screen';
import { TopBar } from '../../src/components/layout/top-bar';
import { SectionHeader } from '../../src/components/layout/section-header';
import { IconButton } from '../../src/components/primitives/icon-button';
import { Card } from '../../src/components/primitives/card';
import { ApiState } from '../../src/components/api/api-state';
import { MedListSkeleton } from '../../src/components/api/skeletons';
import { AdherenceHero } from '../../src/components/meds/adherence-hero';
import { RefillAlertCard } from '../../src/components/meds/refill-alert-card';
import { DoseRow } from '../../src/components/meds/dose-row';
import { MedCard } from '../../src/components/meds/med-card';
import { IconRefresh, IconPlus, IconBell, ChevronRight } from '../../src/icons';
import { useTheme } from '../../src/theme/useTheme';
import { typography } from '../../src/theme/typography';
import { useApiQuery, invalidateApiQuery } from '../../src/api/query';
import { humanizeError } from '../../src/api/error-message';
import { medicationService } from '../../src/api/services';
import { queryKeys } from '../../src/api/queryKeys';
import { toDoseRow, toMedicationCard } from '../../src/api/viewModels';
import type { Adherence, MedicationDose, MedicationPlan } from '../../../shared/api-contracts';

export default function MedsScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const loadMeds = useCallback(async () => {
    const plans = await medicationService.list('active');
    const [doses, adherenceResults] = await Promise.all([
      medicationService.today().catch(() => [] as MedicationDose[]),
      Promise.allSettled(
        plans.map((p) => medicationService.adherence(p.id, '30d')),
      ),
    ]);
    const adherenceRecord: Record<string, Adherence> = {};
    plans.forEach((p, i) => {
      const r = adherenceResults[i];
      if (r?.status === 'fulfilled') adherenceRecord[p.id] = r.value;
    });
    return { plans, doses, adherenceRecord };
  }, []);
  const meds = useApiQuery<{
    plans: MedicationPlan[];
    doses: MedicationDose[];
    adherenceRecord: Record<string, Adherence>;
  }>(queryKeys.medications, loadMeds);
  const adherenceRecord = meds.data?.adherenceRecord ?? {};
  const plans = meds.data?.plans ?? [];
  const doses = meds.data?.doses ?? [];
  const overallAdherence = plans.length > 0
    ? { percent: Object.values(adherenceRecord).reduce((sum, a) => sum + a.percent, 0) / plans.length }
    : null;
  const firstAdherence = plans[0] ? adherenceRecord[plans[0].id] ?? null : null;
  const refillPlan = plans.reduce<MedicationPlan | null>((soonest, plan) => {
    if (!plan.next_refill_estimated_at) return soonest;
    if (!soonest?.next_refill_estimated_at) return plan;
    return new Date(plan.next_refill_estimated_at).getTime() < new Date(soonest.next_refill_estimated_at).getTime()
      ? plan
      : soonest;
  }, null);
  const refillDaysLeft = refillPlan?.next_refill_estimated_at
    ? Math.max(0, Math.ceil((new Date(refillPlan.next_refill_estimated_at).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <Screen>
      <TopBar
        title={i18n('meds.title')}
        subtitle={i18n('meds.activeAdherence', { count: plans.length, pct: overallAdherence ? Math.round(overallAdherence.percent) : 0 })}
        right={
          <View style={styles.actions}>
            <IconButton variant="subtle" icon={<IconRefresh size={20} color={t.ink3} />} accessibilityLabel={i18n('common.retry')} onPress={meds.reload} />
            <IconButton
              icon={<IconPlus size={20} color={t.brand} />}
              variant="filled"
              accessibilityLabel={i18n('meds.addMedication')}
              onPress={() => router.push('/meds/add')}
            />
          </View>
        }
      />

      {meds.isLoading && (
        <ApiState title={i18n('meds.loadingMedications')} loading skeleton={<MedListSkeleton />} />
      )}
      {meds.error && (
        <ApiState
          title={i18n('meds.medicationsUnavailable')}
          message={humanizeError(meds.error)}
          actionLabel={i18n('common.retry')}
          onAction={meds.reload}
        />
      )}

      {firstAdherence && (
        <AdherenceHero
          percent={firstAdherence.percent > 1 ? firstAdherence.percent / 100 : firstAdherence.percent}
          taken={firstAdherence.taken}
          total={firstAdherence.scheduled}
          missed={firstAdherence.missed}
        />
      )}

      {refillPlan?.next_refill_estimated_at && (
        <RefillAlertCard
          message={`${refillPlan.name} refill due soon`}
          daysLeft={refillDaysLeft}
          onPress={() => router.push(('/meds/refill/' + refillPlan.id) as never)}
        />
      )}

      <SectionHeader title={i18n('meds.todaysDoses')} action={i18n('common.viewAll')} onActionPress={() => router.push('/meds/history')} />
      <Card tight>
        {doses.length === 0 && !meds.isLoading ? (
          <ApiState title={i18n('meds.noDosesToday')} message={i18n('meds.noDosesTodayMessage')} />
        ) : (
          doses.map((dose) => {
            const row = toDoseRow(dose);
            return (
              <DoseRow
                key={row.id}
                {...row}
                onTaken={async () => {
                  await medicationService.markDoseDone(row.reminderId, row.occurrenceId);
                  invalidateApiQuery(queryKeys.medications);
                  await meds.reload();
                }}
              />
            );
          })
        )}
      </Card>

      <SectionHeader title={i18n('meds.activeMedications')} />
      {plans.length === 0 && !meds.isLoading && !meds.error && (
        <ApiState
          title={i18n('meds.noActiveMedications')}
          message={i18n('meds.noActiveMedicationsMessage')}
          actionLabel={i18n('meds.addMedication')}
          onAction={() => router.push('/meds/add')}
        />
      )}
      {plans.map((plan) => (
        <MedCard
          key={plan.id}
          {...toMedicationCard(plan, adherenceRecord[plan.id] ?? null)}
          onPress={() => router.push(`/meds/${plan.id}` as never)}
        />
      ))}

      <SectionHeader title={i18n('reminders.title')} />
      <Pressable
        onPress={() => router.push('/reminders' as never)}
        style={[styles.remindersRow, { backgroundColor: t.card, borderColor: t.border }]}
      >
        <IconBell size={20} color={t.brand} />
        <Text style={[typography.bodyMed, { color: t.ink, flex: 1, marginLeft: 12 }]}>{i18n('meds.medicationReminders')}</Text>
        <ChevronRight size={18} color={t.ink3} />
      </Pressable>

      <Text style={[typography.micro, { color: t.ink4, textAlign: 'center', marginTop: 16 }]}>
        {i18n('meds.disclaimer')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions:      { flexDirection: 'row', gap: 4 },
  remindersRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
});
