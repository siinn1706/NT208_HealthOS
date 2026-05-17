import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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

const IMPORT_OPTIONS = [
  { Icon: IconCamera, title: 'Scan prescription',    sub: 'Scan a printed prescription with your camera' },
  { Icon: IconSearch, title: 'Search drug database', sub: 'Find by brand name or active ingredient' },
  { Icon: IconPill,   title: 'Enter manually',       sub: 'Type in medication details yourself' },
];

export function ImportMedicationScreen() {
  const t = useTheme();
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
          title="Import medications"
          left={
            <IconButton
              icon={<ChevronLeft size={22} color={t.ink} />}
              onPress={() => router.back()}
              accessibilityLabel="Back"
            />
          }
        />
      </View>

      <Modal visible={missingModalTitle !== null} transparent animationType="fade" onRequestClose={() => setMissingModalTitle(null)}>
        <Pressable style={s.modalBackdrop} onPress={() => setMissingModalTitle(null)}>
          <View style={[s.modalSheet, { backgroundColor: t.bgElev, borderRadius: t.radius.xl }]}>
            <MissingApiState title={missingModalTitle ?? ''} contract="not yet available" />
            <Button label="Close" variant="ghost" onPress={() => setMissingModalTitle(null)} style={{ marginTop: 8 }} />
          </View>
        </Pressable>
      </Modal>

      <ScrollView style={s.flex} contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
        {error && <ApiState title="Import failed" message={error} />}

        <Text style={[typography.body, { color: t.brand, lineHeight: 22 }]}>
          Connect a source below to automatically import your prescriptions and medication history.
        </Text>

        {sourceAppointmentId && (
          <Button
            label={importing ? 'Importing...' : 'Import appointment prescription'}
            variant="solid"
            onPress={importing ? undefined : importFromAppointment}
            style={importing ? { opacity: 0.4 } : undefined}
          />
        )}

        <Text style={[typography.h3, { color: t.ink, marginBottom: 8 }]}>Connected sources</Text>
        <MissingApiState title="Connected sources" contract="Prescription source API not yet available." />

        <Text style={[typography.h3, { color: t.ink, marginBottom: 8, marginTop: 8 }]}>Pending imports</Text>
        <MissingApiState title="Pending imports" contract="Pending prescription import API not yet available." />

        <Text style={[typography.h3, { color: t.ink, marginBottom: 8, marginTop: 8 }]}>Add another way</Text>
        {IMPORT_OPTIONS.map(opt => (
          <Pressable
            key={opt.title}
            onPress={() => {
              if (opt.title === 'Scan prescription') setMissingModalTitle('Prescription scanner not yet available.');
              else if (opt.title === 'Search drug database') setMissingModalTitle('Drug database search not yet available.');
              else if (opt.title === 'Enter manually') router.push('/meds/add');
            }}
            style={({ pressed }) => [
              s.optRow,
              { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg },
              pressed && { opacity: 0.75 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={opt.title}
          >
            <View style={[s.optIcon, { backgroundColor: t.brandSoft, borderRadius: t.radius.md }]}>
              <opt.Icon size={22} color={t.brand} />
            </View>
            <View style={s.flex}>
              <Text style={[typography.bodyMed, { color: t.ink }]}>{opt.title}</Text>
              <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>{opt.sub}</Text>
            </View>
          </Pressable>
        ))}

        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
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
