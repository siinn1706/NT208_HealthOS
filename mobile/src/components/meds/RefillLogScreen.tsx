import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/TopBar';
import { Card } from '../primitives/Card';
import { Button } from '../primitives/Button';
import { Chip } from '../primitives/Chip';
import { IconButton } from '../primitives/IconButton';
import { ApiState } from '../api/ApiState';
import { ChevronLeft, IconRefresh, IconPill } from '../../icons';
import { medicationService } from '../../api/services';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { formatDate } from '../../api/viewModels';

const STUB_HISTORY = [
  { id: '1', date: 'May 1, 2025',  units: 30, status: 'completed' as const },
  { id: '2', date: 'Apr 1, 2025',  units: 30, status: 'completed' as const },
  { id: '3', date: 'Mar 3, 2025',  units: 28, status: 'completed' as const },
  { id: '4', date: 'Feb 4, 2025',  units: 30, status: 'completed' as const },
];

export function RefillLogScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const medicationId = (Array.isArray(id) ? id[0] : id) ?? '';
  const loadMedication = useCallback(() => medicationService.detail(medicationId), [medicationId]);
  const medication = useApiQuery(queryKeys.medication(medicationId), loadMedication, { enabled: Boolean(medicationId) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supplyUnits, setSupplyUnits] = useState<string>('');

  const currentUnits = medication.data?.refill_supply_units ?? 0;
  const isRunningLow = currentUnits > 0 && currentUnits <= 7;

  async function logRefill() {
    if (!medication.data) return;
    setSaving(true);
    setError(null);
    try {
      const units = supplyUnits.trim() ? parseInt(supplyUnits, 10) : (medication.data.refill_supply_units ?? 30);
      await medicationService.refill(medication.data.id, Number.isNaN(units) ? 30 : units);
      invalidateApiQuery(queryKeys.medications);
      invalidateApiQuery(queryKeys.medication(medication.data.id));
      await medication.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log refill.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.bar}>
        <TopBar
          title="Refill"
          left={
            <IconButton
              icon={<ChevronLeft size={22} color={t.ink} />}
              onPress={() => router.back()}
              accessibilityLabel="Back"
            />
          }
        />
      </View>

      <ScrollView style={s.flex} contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
        {medication.isLoading && <ApiState title="Loading refill info" loading />}
        {medication.error && <ApiState title="Refill unavailable" message={medication.error.message} actionLabel="Retry" onAction={medication.reload} />}
        {error && <ApiState title="Refill failed" message={error} />}

        {medication.data && (
          <>
            {/* Running low alert */}
            {isRunningLow && (
              <View style={[s.alertCard, { backgroundColor: `${t.warning}18`, borderRadius: t.radius.lg, borderWidth: 1, borderColor: `${t.warning}40` }]}>
                <View style={[s.alertIcon, { backgroundColor: `${t.warning}22`, borderRadius: t.radius.pill }]}>
                  <IconPill size={18} color={t.warning} />
                </View>
                <View style={s.alertBody}>
                  <Text style={[{ fontSize: 40, fontWeight: '700', color: t.warning, lineHeight: 44 }]}>
                    {currentUnits}
                  </Text>
                  <Text style={[typography.bodyMed, { color: t.warning }]}>units remaining</Text>
                  <Text style={[typography.caption, { color: t.ink3, marginTop: 4 }]}>
                    Running low — request a refill soon
                  </Text>
                </View>
                <Button
                  label="Request refill"
                  variant="solid"
                  style={s.alertBtn}
                  onPress={() => {}}
                />
              </View>
            )}

            {/* Log refill form */}
            <Text style={[typography.micro, { color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }]}>
              SUPPLY UNITS
            </Text>
            <TextInput
              value={supplyUnits}
              onChangeText={setSupplyUnits}
              placeholder={`${medication.data.refill_supply_units ?? 30}`}
              placeholderTextColor={t.ink4}
              keyboardType="numeric"
              style={[
                s.unitsInput,
                { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.md, color: t.ink },
              ]}
            />

            <Button
              label={saving ? 'Logging...' : 'Log refill'}
              variant="solid"
              icon={<IconRefresh size={16} color="#fff" />}
              onPress={saving ? undefined : logRefill}
              style={[{ marginBottom: 16 }, saving && { opacity: 0.4 }]}
            />

            {/* Current projection */}
            <Text style={[typography.h3, { color: t.ink, marginBottom: 8 }]}>Current projection</Text>
            <Card style={s.listCard}>
              <View style={s.refillRow}>
                <View style={[s.dot, { backgroundColor: t.success }]} />
                <View style={s.flex}>
                  <Text style={[typography.bodyMed, { color: t.ink }]}>
                    {medication.data.refill_supply_units ?? 0} units
                  </Text>
                  <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>
                    Every {medication.data.refill_cadence_days ?? '—'} days
                  </Text>
                </View>
                <View style={s.right}>
                  <Text style={[typography.caption, { color: t.ink3 }]}>
                    {formatDate(medication.data.last_refill_at)}
                  </Text>
                  <Text style={[typography.micro, { color: t.ink4, marginTop: 2 }]}>
                    Next {formatDate(medication.data.next_refill_estimated_at)}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Refill history */}
            <Text style={[typography.h3, { color: t.ink, marginBottom: 8, marginTop: 16 }]}>Refill history</Text>
            <Card style={s.listCard}>
              {STUB_HISTORY.map((row, i) => (
                <View
                  key={row.id}
                  style={[
                    s.historyRow,
                    i < STUB_HISTORY.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
                  ]}
                >
                  <View style={[s.dot, { backgroundColor: t.success }]} />
                  <View style={s.flex}>
                    <Text style={[typography.bodyMed, { color: t.ink }]}>{row.units} units</Text>
                    <Text style={[typography.caption, { color: t.ink3, marginTop: 1 }]}>{row.date}</Text>
                  </View>
                  <Chip label="Completed" variant="success" />
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1 },
  flex:       { flex: 1 },
  bar:        { paddingHorizontal: 16 },
  content:    { paddingHorizontal: 16, paddingTop: 4 },
  alertCard:  { padding: 16, marginBottom: 16, alignItems: 'center', gap: 4 },
  alertIcon:  { paddingHorizontal: 10, paddingVertical: 8, marginBottom: 4 },
  alertBody:  { alignItems: 'center', gap: 2 },
  alertBtn:   { marginTop: 12, alignSelf: 'stretch' },
  listCard:   { padding: 0 },
  refillRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  right:      { alignItems: 'flex-end', gap: 2 },
  unitsInput: { paddingHorizontal: 14, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, fontSize: 14, marginBottom: 12 },
});
