import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Modal, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/top-bar';
import { Button } from '../primitives/button';
import { IconButton } from '../primitives/icon-button';
import { ApiState } from '../api/api-state';
import { ChevronLeft, IconRefresh } from '../../icons';
import { medicationService } from '../../api/services';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { RefillStatusCard } from './refill-status-card';
import { defaultRefillUnits, parseRefillUnits } from './refill-units';

export function RefillLogScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const medicationId = (Array.isArray(id) ? id[0] : id) ?? '';
  const loadMedication = useCallback(() => medicationService.detail(medicationId), [medicationId]);
  const medication = useApiQuery(queryKeys.medication(medicationId), loadMedication, { enabled: Boolean(medicationId) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supplyUnits, setSupplyUnits] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const hasSupply = medication.data?.refill_supply_units !== null && medication.data?.refill_supply_units !== undefined;
  const currentUnits = medication.data?.refill_supply_units ?? 0;
  const refillUnitsFallback = defaultRefillUnits(medication.data?.refill_supply_units);
  const refillUnitsPreview = parseRefillUnits(supplyUnits, refillUnitsFallback);
  const isRunningLow = hasSupply && currentUnits <= 7;

  function openConfirm() {
    const parsed = parseRefillUnits(supplyUnits, refillUnitsFallback);
    if ('errorKey' in parsed) {
      setError(i18n(parsed.errorKey as any));
      return;
    }
    setError(null);
    setConfirmOpen(true);
  }

  async function logRefill() {
    if (!medication.data) return;
    const parsed = parseRefillUnits(supplyUnits, refillUnitsFallback);
    if ('errorKey' in parsed) {
      setConfirmOpen(false);
      setError(i18n(parsed.errorKey as any));
      return;
    }
    setConfirmOpen(false);
    setSaving(true);
    setError(null);
    try {
      await medicationService.refill(medication.data.id, parsed.units);
      invalidateApiQuery(queryKeys.medications);
      invalidateApiQuery(queryKeys.medication(medication.data.id));
      invalidateApiQuery(queryKeys.medicationDosesToday);
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
          title={`${i18n('meds.refills')}${medication.data ? ` · ${medication.data.name}` : ''}`}
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
            <Text style={[typography.h3, { color: t.ink, marginBottom: 8 }]}>{i18n('meds.logRefillConfirm')}</Text>
            <Text style={[typography.body, { color: t.ink2, marginBottom: 16 }]}>
              {i18n('meds.logRefillConfirmMessage', {
                units: 'units' in refillUnitsPreview ? refillUnitsPreview.units : refillUnitsFallback,
                name: medication.data?.name ?? '',
              })}
            </Text>
            <View style={s.confirmRow}>
              <Button label={i18n('common.cancel')} variant="ghost" onPress={() => setConfirmOpen(false)} style={s.confirmBtn} />
              <Button label={i18n('common.confirm')} variant="solid" onPress={logRefill} style={s.confirmBtn} />
            </View>
          </View>
        </Pressable>
      </Modal>

      <ScrollView style={s.flex} contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
        {medication.isLoading && <ApiState title={i18n('api.loading')} loading />}
        {medication.error && <ApiState title={i18n('api.unavailable')} message={medication.error.message} actionLabel={i18n('common.retry')} onAction={medication.reload} />}
        {error && <ApiState title="Refill failed" message={error} />}

        {medication.data && (
          <>
            {isRunningLow && (
              <View style={[s.alertCard, { backgroundColor: `${t.warning}18`, borderRadius: t.radius.lg, borderWidth: 1, borderColor: `${t.warning}40` }]}>
                <Text style={{ fontSize: 44, fontWeight: '700', color: t.warning, lineHeight: 50, textAlign: 'center' }}>
                  {currentUnits}
                </Text>
                <Text style={[typography.bodyMed, { color: t.warning, textAlign: 'center' }]}>{i18n('meds.unitsRemaining')}</Text>
                <Text style={[typography.caption, { color: t.ink3, marginTop: 4, textAlign: 'center' }]}>
                  {i18n('meds.runningLow')}
                </Text>
                <Button
                  label={i18n('meds.logRefill')}
                  variant="solid"
                  style={s.alertBtn}
                  onPress={openConfirm}
                />
              </View>
            )}

            <Text style={[typography.h3, { color: t.ink, marginBottom: 8 }]}>{i18n('meds.refillStatus')}</Text>
            <RefillStatusCard medication={medication.data} />

            <Text style={[typography.micro, { color: t.brand, textAlign: 'center' }]}>
              {i18n('meds.contactPharmacyRefill')}
            </Text>

            <Text style={[typography.h3, { color: t.ink, marginBottom: 8, marginTop: 8 }]}>{i18n('meds.logRefill')}</Text>
            <Text style={[typography.micro, { color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }]}>
              {i18n('meds.supplyUnits')}
            </Text>
            <TextInput
              value={supplyUnits}
              onChangeText={setSupplyUnits}
              placeholder={`${refillUnitsFallback}`}
              placeholderTextColor={t.ink4}
              keyboardType="numeric"
              style={[
                s.unitsInput,
                { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.md, color: t.ink },
              ]}
            />

            <Button
              label={saving ? i18n('meds.saving') : i18n('meds.logRefill')}
              variant="solid"
              icon={<IconRefresh size={16} color="#fff" />}
              onPress={saving ? undefined : openConfirm}
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
