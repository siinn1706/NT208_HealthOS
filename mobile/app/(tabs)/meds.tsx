import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/layout/Screen';
import { TopBar } from '../../src/components/layout/TopBar';
import { SectionHeader } from '../../src/components/layout/SectionHeader';
import { IconButton } from '../../src/components/primitives/IconButton';
import { Card } from '../../src/components/primitives/Card';
import { ApiState } from '../../src/components/api/ApiState';
import { MedListSkeleton } from '../../src/components/api/Skeletons';
import { AdherenceHero } from '../../src/components/meds/AdherenceHero';
import { RefillAlertCard } from '../../src/components/meds/RefillAlertCard';
import { DoseRow } from '../../src/components/meds/DoseRow';
import { MedCard } from '../../src/components/meds/MedCard';
import { IconRefresh, IconPlus } from '../../src/icons';
import { useTheme } from '../../src/theme/useTheme';
import { typography } from '../../src/theme/typography';
import { useApiQuery, invalidateApiQuery } from '../../src/api/query';
import { medicationService } from '../../src/api/services';
import { queryKeys } from '../../src/api/queryKeys';
import { toDoseRow, toMedicationCard } from '../../src/api/viewModels';
import type { Adherence, MedicationDose, MedicationPlan } from '../../../shared/api-contracts';

export default function MedsScreen() {
  const t = useTheme();
  const loadMeds = useCallback(async () => {
    const [plans, doses] = await Promise.all([
      medicationService.list('active'),
      medicationService.today(),
    ]);
    const adherence = plans[0] ? await medicationService.adherence(plans[0].id, '30d') : null;
    return { plans, doses, adherence };
  }, []);
  const meds = useApiQuery<{
    plans: MedicationPlan[];
    doses: MedicationDose[];
    adherence: Adherence | null;
  }>(queryKeys.medications, loadMeds);
  const adherence = meds.data?.adherence;
  const plans = meds.data?.plans ?? [];
  const doses = meds.data?.doses ?? [];
  const refillPlan = plans
    .filter((plan) => plan.next_refill_estimated_at)
    .sort((a, b) => new Date(a.next_refill_estimated_at ?? 0).getTime() - new Date(b.next_refill_estimated_at ?? 0).getTime())[0];

  return (
    <Screen>
      <TopBar
        title="Medications"
        subtitle={`${plans.length} active · ${adherence ? Math.round(adherence.percent) : 0}% adherence`}
        right={
          <View style={styles.actions}>
            <IconButton icon={<IconRefresh size={20} color={t.ink3} />} accessibilityLabel="Refresh" onPress={meds.reload} />
            <IconButton
              icon={<IconPlus size={20} color={t.brand} />}
              variant="filled"
              accessibilityLabel="Add medication"
              onPress={() => router.push('/meds/add')}
            />
          </View>
        }
      />

      {meds.isLoading && (
        <ApiState title="Loading medications" loading skeleton={<MedListSkeleton />} />
      )}
      {meds.error && (
        <ApiState
          title="Medications unavailable"
          message={meds.error.message}
          actionLabel="Retry"
          onAction={meds.reload}
        />
      )}

      {adherence && (
        <AdherenceHero
          percent={adherence.percent > 1 ? adherence.percent / 100 : adherence.percent}
          taken={adherence.taken}
          total={adherence.scheduled}
          missed={adherence.missed}
        />
      )}

      {refillPlan?.next_refill_estimated_at && (
        <RefillAlertCard
          message={`${refillPlan.name} refill due soon`}
          daysLeft={Math.max(0, Math.ceil((new Date(refillPlan.next_refill_estimated_at).getTime() - Date.now()) / 86400000))}
          onPress={() => router.push(('/meds/refill/' + refillPlan.id) as never)}
        />
      )}

      <SectionHeader title="Today's doses" action="View all" onActionPress={() => router.push('/meds/history')} />
      <Card tight>
        {doses.length === 0 && !meds.isLoading ? (
          <ApiState title="No doses today" message="Today's medication schedule is empty." />
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

      <SectionHeader title="Active medications" />
      {plans.length === 0 && !meds.isLoading && !meds.error && (
        <ApiState title="No active medications" message="Add a medication or import one from a prescription." />
      )}
      {plans.map((plan) => (
        <MedCard
          key={plan.id}
          {...toMedicationCard(plan, adherence)}
          onPress={() => router.push(`/meds/${plan.id}` as never)}
        />
      ))}

      <Text style={[typography.micro, { color: t.ink4, textAlign: 'center', marginTop: 16 }]}>
        Not a substitute for medical advice. Always follow your doctor's instructions.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 4 },
});
