import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/TopBar';
import { Card } from '../primitives/Card';
import { Button } from '../primitives/Button';
import { IconButton } from '../primitives/IconButton';
import { Toggle } from '../primitives/Toggle';
import { Checkbox } from '../primitives/input/Checkbox';
import { ChevronLeft, IconCamera, IconSearch, IconPill, IconStethoscope } from '../../icons';
import { medicationService } from '../../api/services';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { ApiState, MissingApiState } from '../api/ApiState';

const IMPORT_OPTIONS = [
  { Icon: IconCamera,    title: 'Scan prescription',    sub: 'Scan a printed prescription with your camera' },
  { Icon: IconSearch,    title: 'Search drug database', sub: 'Find by brand name or active ingredient' },
  { Icon: IconPill,      title: 'Enter manually',       sub: 'Type in medication details yourself' },
];

const SOURCES = [
  { id: 'pharmacy',  label: 'My Pharmacy',          sub: 'FPT Pharmacy Chain' },
  { id: 'primary',   label: 'Primary Care',         sub: 'Dr. Nguyen Van A' },
  { id: 'specialist',label: 'Specialist Prescriber', sub: 'Cardiology Dept.' },
];

const PENDING_MEDS = [
  { id: 'm1', name: 'Metformin 500mg',   schedule: 'Twice daily · 90 days' },
  { id: 'm2', name: 'Amlodipine 5mg',    schedule: 'Once daily · 30 days' },
  { id: 'm3', name: 'Atorvastatin 20mg', schedule: 'Once nightly · 30 days' },
];

export function ImportMedicationScreen() {
  const t = useTheme();
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const sourceAppointmentId = Array.isArray(appointmentId) ? appointmentId[0] : appointmentId;
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingModalTitle, setMissingModalTitle] = useState<string | null>(null);
  const [sourceToggles, setSourceToggles] = useState<Record<string, boolean>>({ pharmacy: true, primary: false, specialist: false });
  const [selectedMeds, setSelectedMeds] = useState<Record<string, boolean>>({ m1: true, m2: true, m3: false });

  function toggleSource(id: string) {
    setSourceToggles(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleMed(id: string) {
    setSelectedMeds(prev => ({ ...prev, [id]: !prev[id] }));
  }

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

  const selectedCount = Object.values(selectedMeds).filter(Boolean).length;

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

      <ScrollView style={s.flex} contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
        {error && <ApiState title="Import failed" message={error} />}

        {sourceAppointmentId && (
          <Button
            label={importing ? 'Importing...' : 'Import appointment prescription'}
            variant="solid"
            onPress={importing ? undefined : importFromAppointment}
            style={importing ? { opacity: 0.4 } : undefined}
          />
        )}

        {/* Connected sources */}
        <Text style={[typography.h3, { color: t.ink, marginBottom: 8 }]}>Connected sources</Text>
        <Card style={s.zeroCard}>
          {SOURCES.map((src, i) => (
            <View
              key={src.id}
              style={[
                s.sourceRow,
                i < SOURCES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
              ]}
            >
              <View style={[s.sourceIcon, { backgroundColor: t.brandSoft, borderRadius: t.radius.md }]}>
                <IconStethoscope size={18} color={t.brand} />
              </View>
              <View style={s.flex}>
                <Text style={[typography.bodyMed, { color: t.ink }]}>{src.label}</Text>
                <Text style={[typography.caption, { color: t.ink3, marginTop: 1 }]}>{src.sub}</Text>
              </View>
              <Toggle value={sourceToggles[src.id] ?? false} onChange={() => toggleSource(src.id)} />
            </View>
          ))}
        </Card>

        {/* Choose import method */}
        <Text style={[typography.h3, { color: t.ink, marginBottom: 8 }]}>Import method</Text>
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

        {/* Pending items */}
        <Text style={[typography.h3, { color: t.ink, marginBottom: 8 }]}>Pending imports</Text>
        <Card style={s.zeroCard}>
          {PENDING_MEDS.map((med, i) => (
            <Pressable
              key={med.id}
              onPress={() => toggleMed(med.id)}
              style={[
                s.pendingRow,
                i < PENDING_MEDS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
              ]}
            >
              <View pointerEvents="none">
                <Checkbox value={selectedMeds[med.id] ?? false} onChange={() => toggleMed(med.id)} />
              </View>
              <View style={s.flex}>
                <Text style={[typography.bodyMed, { color: t.ink }]}>{med.name}</Text>
                <Text style={[typography.caption, { color: t.ink3, marginTop: 1 }]}>{med.schedule}</Text>
              </View>
            </Pressable>
          ))}
        </Card>

        <Button
          label={selectedCount > 0 ? `Import ${selectedCount} medication${selectedCount > 1 ? 's' : ''}` : 'Import selected'}
          variant="solid"
          onPress={selectedCount > 0 ? () => setMissingModalTitle('Bulk import not yet available.') : undefined}
          style={selectedCount === 0 ? { opacity: 0.4 } : undefined}
        />

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
  zeroCard:     { padding: 0 },
  sourceRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  sourceIcon:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  optRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderWidth: StyleSheet.hairlineWidth },
  optIcon:      { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pendingRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  modalBackdrop:{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 24 },
  modalSheet:   { width: '100%', padding: 20 },
});
