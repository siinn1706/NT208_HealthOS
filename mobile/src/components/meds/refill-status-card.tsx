import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MedicationPlanDetail } from '../../../../shared/api-contracts';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Card } from '../primitives/card';

function formatRefillDate(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function RefillFact({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={[s.fact, { borderColor: t.border, borderRadius: t.radius.md }]}>
      <Text style={[typography.micro, { color: t.ink3, textTransform: 'uppercase' }]}>{label}</Text>
      <Text style={[typography.bodyMed, { color: t.ink, marginTop: 4 }]}>{value}</Text>
    </View>
  );
}

export function RefillStatusCard({ medication }: { medication: MedicationPlanDetail }) {
  const { t: i18n } = useTranslation();
  const hasSupply = medication.refill_supply_units !== null && medication.refill_supply_units !== undefined;
  const currentUnits = medication.refill_supply_units ?? 0;

  return (
    <Card style={s.statusCard}>
      <View style={s.factGrid}>
        <RefillFact
          label={i18n('meds.unitsOnHand')}
          value={hasSupply ? i18n('meds.unitsCount', { count: currentUnits }) : i18n('meds.notTracked')}
        />
        <RefillFact
          label={i18n('meds.nextRefill')}
          value={formatRefillDate(medication.next_refill_estimated_at, i18n('meds.notEstimated'))}
        />
        <RefillFact
          label={i18n('meds.lastLogged')}
          value={formatRefillDate(medication.last_refill_at, i18n('meds.notTracked'))}
        />
        <RefillFact
          label={i18n('meds.cadence')}
          value={medication.refill_cadence_days ? i18n('meds.daysCount', { count: medication.refill_cadence_days }) : i18n('meds.notSet')}
        />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  statusCard: { gap: 12 },
  factGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fact:       { flexBasis: '47%', flexGrow: 1, minWidth: 130, borderWidth: StyleSheet.hairlineWidth, padding: 12 },
});
