import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Modal, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/top-bar';
import { Button } from '../primitives/button';
import { IconButton } from '../primitives/icon-button';
import { ApiState, MissingApiState } from '../api/api-state';
import { ChevronLeft, IconRefresh } from '../../icons';
import { medicationService } from '../../api/services';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';

export function RefillLogScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const medicationId = (Array.isArray(id) ? id[0] : id) ?? '';
  const loadMedication = useCallback(() => medicationService.detail(medicationId), [medicationId]);
  const medication = useApiQuery(queryKeys.medication(medicationId), loadMedication, { enabled: Boolean(medicationId) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supplyUnits, setSupplyUnits] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [missingOpen, setMissingOpen] = useState(false);

  const currentUnits = medication.data?.refill_supply_units ?? 0;
  const isRunningLow = currentUnits > 0 && currentUnits <= 7;

  async function logRefill() {
    if (!medication.data) return;
    setConfirmOpen(false);
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
          title={`Refills${medication.data ? ` · ${medication.data.name}` : ''}`}
          left={
            <IconButton
              icon={<ChevronLeft size={22} color={t.ink} />}
              onPress={() => router.back()}
              accessibilityLabel="Back"
            />
          }
        />
      </View>

      {/* Confirm log refill modal */}
      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setConfirmOpen(false)}>
          <View style={[s.modalSheet, { backgroundColor: t.card, borderRadius: t.radius.xl }]}>
            <Text style={[typography.h3, { color: t.ink, marginBottom: 8 }]}>Log refill?</Text>
            <Text style={[typography.body, { color: t.ink2, marginBottom: 16 }]}>
              This will record a refill of {supplyUnits.trim() ? supplyUnits : (medication.data?.refill_supply_units ?? 30)} units for {medication.data?.name}.
            </Text>
            <View style={s.confirmRow}>
              <Button label="Cancel" variant="ghost" onPress={() => setConfirmOpen(false)} style={s.confirmBtn} />
              <Button label="Confirm" variant="solid" onPress={logRefill} style={s.confirmBtn} />
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Request refill coming-soon modal */}
      <Modal visible={missingOpen} transparent animationType="fade" onRequestClose={() => setMissingOpen(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setMissingOpen(false)}>
          <View style={[s.modalSheet, { backgroundColor: t.card, borderRadius: t.radius.xl }]}>
            <MissingApiState title="Request refill" contract="Pharmacy refill request API not yet available." />
            <Button label="Close" variant="ghost" onPress={() => setMissingOpen(false)} style={{ marginTop: 8 }} />
          </View>
        </Pressable>
      </Modal>

      <ScrollView style={s.flex} contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
        {medication.isLoading && <ApiState title="Loading refill info" loading />}
        {medication.error && <ApiState title="Refill unavailable" message={medication.error.message} actionLabel="Retry" onAction={medication.reload} />}
        {error && <ApiState title="Refill failed" message={error} />}

        {medication.data && (
          <>
            {isRunningLow && (
              <View style={[s.alertCard, { backgroundColor: `${t.warning}18`, borderRadius: t.radius.lg, borderWidth: 1, borderColor: `${t.warning}40` }]}>
                <Text style={[{ fontSize: 44, fontWeight: '700', color: t.warning, lineHeight: 50, textAlign: 'center' }]}>
                  {currentUnits}
                </Text>
                <Text style={[typography.bodyMed, { color: t.warning, textAlign: 'center' }]}>units remaining</Text>
                <Text style={[typography.caption, { color: t.ink3, marginTop: 4, textAlign: 'center' }]}>
                  Running low — request a refill soon
                </Text>
                <Button
                  label="Request refill"
                  variant="solid"
                  style={[s.alertBtn]}
                  onPress={() => setMissingOpen(true)}
                />
              </View>
            )}

            <Text style={[typography.h3, { color: t.ink, marginBottom: 8 }]}>Refill history</Text>
            <MissingApiState title="Refill history" contract="Refill history API not yet available." />

            <Text style={[typography.micro, { color: t.brand, textAlign: 'center' }]}>
              Contact your pharmacy to update refill history
            </Text>

            <Text style={[typography.h3, { color: t.ink, marginBottom: 8, marginTop: 8 }]}>Log a refill</Text>
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
              onPress={saving ? undefined : () => setConfirmOpen(true)}
              style={saving && { opacity: 0.4 }}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  flex:         { flex: 1 },
  bar:          { paddingHorizontal: 16 },
  content:      { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  alertCard:    { padding: 20, alignItems: 'center', gap: 4 },
  alertBtn:     { marginTop: 12, alignSelf: 'stretch' },
  unitsInput:   { paddingHorizontal: 14, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, fontSize: 14 },
  modalBackdrop:{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 24 },
  modalSheet:   { width: '100%', padding: 20 },
  confirmRow:   { flexDirection: 'row', gap: 10 },
  confirmBtn:   { flex: 1 },
});
