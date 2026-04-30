import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/TopBar';
import { Card } from '../primitives/Card';
import { Button } from '../primitives/Button';
import { IconButton } from '../primitives/IconButton';
import { ChevronLeft, IconCamera, IconSearch, IconPill } from '../../icons';
import { medicationService } from '../../api/services';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { ApiState, MissingApiState } from '../api/ApiState';

const IMPORT_OPTIONS = [
  {
    Icon: IconCamera,
    title: 'Scan prescription',
    sub: 'Use your camera to scan a printed prescription',
  },
  {
    Icon: IconSearch,
    title: 'Search drug database',
    sub: 'Find by brand name or active ingredient',
  },
  {
    Icon: IconPill,
    title: 'Enter manually',
    sub: 'Type in medication details yourself',
  },
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

      {/* Missing feature modal */}
      <Modal visible={missingModalTitle !== null} transparent animationType="fade" onRequestClose={() => setMissingModalTitle(null)}>
        <Pressable style={s.modalBackdrop} onPress={() => setMissingModalTitle(null)}>
          <View style={[s.modalSheet, { backgroundColor: t.bgElev, borderRadius: t.radius.xl }]}>
            <MissingApiState title={missingModalTitle ?? ''} contract="not yet available" />
            <Button label="Close" variant="ghost" onPress={() => setMissingModalTitle(null)} style={{ marginTop: 8 }} />
          </View>
        </Pressable>
      </Modal>

      <View style={s.content}>
        {error && <ApiState title="Import failed" message={error} />}
        {sourceAppointmentId && (
          <Button
            label={importing ? 'Importing...' : 'Import appointment prescription'}
            variant="solid"
            onPress={importing ? undefined : importFromAppointment}
            style={importing ? { opacity: 0.4 } : undefined}
          />
        )}

        {/* Explainer */}
        <Card style={{ ...s.infoCard, backgroundColor: t.chip }}>
          <Text style={[typography.bodyMed, { color: t.ink, marginBottom: 4 }]}>
            Import from your pharmacy or prescriber
          </Text>
          <Text style={[typography.caption, { color: t.ink3, lineHeight: 18 }]}>
            You can scan a printed prescription, search our drug database, or add medications manually. Your data stays private and is never shared without permission.
          </Text>
        </Card>

        <Text style={[typography.h3, { color: t.ink, marginBottom: 10 }]}>
          Choose import method
        </Text>

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
              {
                backgroundColor: t.card,
                borderColor: t.border,
                borderRadius: t.radius.lg,
              },
              pressed && { opacity: 0.75 },
            ]}
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

        <MissingApiState title="Scan and drug search unavailable" contract="missing API" />

        <Button
          label="Cancel"
          variant="ghost"
          onPress={() => router.back()}
          style={{ marginTop: 8 }}
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  bar:          { paddingHorizontal: 16 },
  content:      { flex: 1, paddingHorizontal: 16, gap: 10 },
  infoCard:     { marginBottom: 4 },
  optRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderWidth: StyleSheet.hairlineWidth },
  optIcon:      { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  flex:         { flex: 1 },
  modalBackdrop:{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 24 },
  modalSheet:   { width: '100%', padding: 20 },
});
