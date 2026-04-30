import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/TopBar';
import { Card } from '../primitives/Card';
import { Button } from '../primitives/Button';
import { IconButton } from '../primitives/IconButton';
import { ApiState, MissingApiState } from '../api/ApiState';
import { ChevronLeft, IconRefresh } from '../../icons';
import { medicationService } from '../../api/services';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { formatDate } from '../../api/viewModels';

export function RefillLogScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const medicationId = (Array.isArray(id) ? id[0] : id) ?? '';
  const loadMedication = useCallback(() => medicationService.detail(medicationId), [medicationId]);
  const medication = useApiQuery(queryKeys.medication(medicationId), loadMedication, { enabled: Boolean(medicationId) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supplyUnits, setSupplyUnits] = useState<string>('');

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

            <Text style={[typography.h3, { color: t.ink, marginBottom: 10 }]}>Current refill projection</Text>
            <Card style={s.listCard}>
              <View style={s.refillRow}>
                <View style={[s.dot, { backgroundColor: t.success }]} />
                <View style={s.flex}>
                  <Text style={[typography.bodyMed, { color: t.ink }]}>
                    {medication.data.refill_supply_units ?? 0} units
                  </Text>
                  <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>
                    Cadence {medication.data.refill_cadence_days ?? 'not set'} days
                  </Text>
                </View>
                <View style={s.right}>
                  <Text style={[typography.caption, { color: t.ink3 }]}>
                    {formatDate(medication.data.last_refill_at)}
                  </Text>
                  <Text style={[typography.micro, { color: t.ink4 }]}>
                    Next {formatDate(medication.data.next_refill_estimated_at)}
                  </Text>
                </View>
              </View>
            </Card>

            <MissingApiState title="Refill history unavailable" contract="unclear and needs manual confirmation" />
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
  listCard:   { padding: 0 },
  refillRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  right:      { alignItems: 'flex-end', gap: 4 },
  unitsInput: { paddingHorizontal: 14, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, fontSize: 14, marginBottom: 12 },
});
