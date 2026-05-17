import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/top-bar';
import { Button } from '../primitives/button';
import { IconButton } from '../primitives/icon-button';
import { ChevronLeft, IconCamera, IconSearch, IconPill } from '../../icons';
import { medicationService } from '../../api/services';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { ApiState, MissingApiState } from '../api/api-state';

const IMPORT_OPTION_KEYS = [
  { Icon: IconCamera, titleKey: 'scanPrescription',    subKey: 'scanPrescriptionSub' },
  { Icon: IconSearch, titleKey: 'searchDrugDatabase',  subKey: 'searchDrugDatabaseSub' },
  { Icon: IconPill,   titleKey: 'enterManually',       subKey: 'enterManuallySub' },
] as const;

export function ImportMedicationScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const sourceAppointmentId = Array.isArray(appointmentId) ? appointmentId[0] : appointmentId;
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingModalTitle, setMissingModalTitle] = useState<string | null>(null);

  async function importFromAppointment() {
    if (!sourceAppointmentId) return;
    setImporting(true);
    setError(null);
    try {
      await medicationService.importFromAppointment(sourceAppointmentId);
      invalidateApiQuery(queryKeys.medications);
      router.replace('/(tabs)/meds');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to import prescription.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.bar}>
        <TopBar
          title={i18n('meds.importMeds')}
          left={
            <IconButton
              icon={<ChevronLeft size={22} color={t.ink} />}
              onPress={() => router.back()}
              accessibilityLabel={i18n('common.back')}
            />
          }
        />
      </View>

      <Modal visible={missingModalTitle !== null} transparent animationType="fade" onRequestClose={() => setMissingModalTitle(null)}>
        <Pressable style={s.modalBackdrop} onPress={() => setMissingModalTitle(null)}>
          <View style={[s.modalSheet, { backgroundColor: t.bgElev, borderRadius: t.radius.xl }]}>
            <MissingApiState title={missingModalTitle ?? ''} contract="not yet available" />
            <Button label={i18n('common.close')} variant="ghost" onPress={() => setMissingModalTitle(null)} style={{ marginTop: 8 }} />
          </View>
        </Pressable>
      </Modal>

      <ScrollView style={s.flex} contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
        {error && <ApiState title="Import failed" message={error} />}

        <Text style={[typography.body, { color: t.brand, lineHeight: 22 }]}>
          {i18n('meds.importDescription')}
        </Text>

        {sourceAppointmentId && (
          <Button
            label={importing ? 'Importing...' : 'Import appointment prescription'}
            variant="solid"
            onPress={importing ? undefined : importFromAppointment}
            style={importing ? { opacity: 0.4 } : undefined}
          />
        )}

        <Text style={[typography.h3, { color: t.ink, marginBottom: 8 }]}>{i18n('meds.connectedSources')}</Text>
        <MissingApiState title={i18n('meds.connectedSources')} contract="Prescription source API not yet available." />

        <Text style={[typography.h3, { color: t.ink, marginBottom: 8, marginTop: 8 }]}>{i18n('meds.pendingImports')}</Text>
        <MissingApiState title={i18n('meds.pendingImports')} contract="Pending prescription import API not yet available." />

        <Text style={[typography.h3, { color: t.ink, marginBottom: 8, marginTop: 8 }]}>{i18n('meds.addAnotherWay')}</Text>
        {IMPORT_OPTION_KEYS.map(opt => {
          const title = i18n(`meds.${opt.titleKey}` as any);
          const sub = i18n(`meds.${opt.subKey}` as any);
          return (
          <Pressable
            key={opt.titleKey}
            onPress={() => {
              if (opt.titleKey === 'scanPrescription') setMissingModalTitle('Prescription scanner not yet available.');
              else if (opt.titleKey === 'searchDrugDatabase') setMissingModalTitle('Drug database search not yet available.');
              else if (opt.titleKey === 'enterManually') router.push('/meds/add');
            }}
            style={({ pressed }) => [
              s.optRow,
              { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg },
              pressed && { opacity: 0.75 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={title}
          >
            <View style={[s.optIcon, { backgroundColor: t.brandSoft, borderRadius: t.radius.md }]}>
              <opt.Icon size={22} color={t.brand} />
            </View>
            <View style={s.flex}>
              <Text style={[typography.bodyMed, { color: t.ink }]}>{title}</Text>
              <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>{sub}</Text>
            </View>
          </Pressable>
          );
        })}

        <Button label={i18n('common.cancel')} variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  flex:         { flex: 1 },
  bar:          { paddingHorizontal: 16 },
  content:      { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  optRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderWidth: StyleSheet.hairlineWidth },
  optIcon:      { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop:{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 24 },
  modalSheet:   { width: '100%', padding: 20 },
});
