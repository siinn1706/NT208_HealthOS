import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Chip } from '../primitives/Chip';
import { Card } from '../primitives/Card';
import { Button } from '../primitives/Button';
import { TopBar } from '../layout/TopBar';
import { IconButton } from '../primitives/IconButton';
import { ApiState, MissingApiState } from '../api/ApiState';
import { ChevronLeft, IconClock, IconPill, IconUser } from '../../icons';
import { BarcodePlaceholder } from './BarcodePlaceholder';
import { useApiQuery } from '../../api/query';
import { appointmentService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import { formatDate } from '../../api/viewModels';

export function PrescriptionDetailScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const appointmentId = (Array.isArray(id) ? id[0] : id) ?? '';
  const loadAppointment = useCallback(() => appointmentService.detail(appointmentId), [appointmentId]);
  const appointmentQuery = useApiQuery(queryKeys.appointment(appointmentId), loadAppointment, { enabled: Boolean(appointmentId) });
  const prescription = appointmentQuery.data?.prescription ?? null;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.bar}>
        <TopBar
          title="Prescription"
          left={<IconButton icon={<ChevronLeft size={22} color={t.ink} />} onPress={() => router.back()} accessibilityLabel="Back" />}
        />
      </View>

      <ScrollView style={s.flex} contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
        {appointmentQuery.isLoading && <ApiState title="Loading prescription" loading />}
        {appointmentQuery.error && (
          <ApiState
            title="Prescription unavailable"
            message={appointmentQuery.error.message}
            actionLabel="Retry"
            onAction={appointmentQuery.reload}
          />
        )}
        {!appointmentQuery.isLoading && !appointmentQuery.error && !prescription && (
          <ApiState title="No prescription found" message="No verified prescription payload is attached to this appointment." />
        )}

        {prescription && (
          <>
            <Card style={s.headerCard}>
              <IconPill size={34} color={t.brand} />
              <Text style={[typography.title, { color: t.ink, marginTop: t.space[3] }]}>
                {prescription.medicines[0]?.name ?? 'Prescription'}
              </Text>
              <Text style={[typography.caption, { color: t.ink3 }]}>
                {prescription.diagnosis ?? 'Diagnosis not specified'}
              </Text>
              <View style={s.chips}>
                <Chip label={`${prescription.medicines.length} medicines`} variant="brand" />
                <Chip label={formatDate(prescription.issued_at)} variant="success" />
              </View>
            </Card>

            <Card>
              <InfoRow icon={<IconUser size={14} color={t.ink3} />} label="Doctor" value={prescription.doctor ?? 'Not specified'} />
              <InfoRow icon={<IconClock size={14} color={t.ink3} />} label="Issued" value={formatDate(prescription.issued_at)} />
            </Card>

            <Text style={[typography.h3, { color: t.ink, marginTop: 14, marginBottom: 8 }]}>Medicines</Text>
            {prescription.medicines.map((medicine) => (
              <Card key={`${medicine.name}-${medicine.dosage}`} style={s.medCard}>
                <Text style={[typography.bodyMed, { color: t.ink }]}>{medicine.name}</Text>
                <Text style={[typography.caption, { color: t.ink3, marginTop: 3 }]}>
                  {medicine.dosage} · {medicine.frequency} · {medicine.duration}
                </Text>
                {medicine.notes && (
                  <Text style={[typography.caption, { color: t.ink4, marginTop: 6 }]}>{medicine.notes}</Text>
                )}
              </Card>
            ))}

            {/* Instructions card */}
            <Text style={[typography.h3, { color: t.ink, marginTop: 4, marginBottom: 4 }]}>Instructions</Text>
            <Card>
              <Text style={[typography.body, { color: t.ink2 }]}>
                {prescription.notes ?? 'Take medications as directed. Contact your doctor if you experience side effects.'}
              </Text>
            </Card>

            {/* Barcode visual placeholder */}
            <View style={s.barcodeRow}>
              <BarcodePlaceholder size={120} />
            </View>

            {/* CTAs */}
            <View style={s.ctaRow}>
              <Button label="Share" variant="ghost" style={s.ctaBtn} onPress={() => {}} />
              <Button label="Request refill" variant="solid" style={s.ctaBtn} onPress={() => router.push(`/meds/import?appointmentId=${appointmentId}` as never)} />
            </View>
            <MissingApiState title="Prescription asset download unavailable" contract="existing API needs adaptation" />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={[s.infoRow, { borderBottomColor: t.border }]}>
      {icon}
      <Text style={[typography.caption, { color: t.ink3, width: 86 }]}>{label}</Text>
      <Text style={[typography.bodyMed, { color: t.ink, flex: 1 }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  bar: { paddingHorizontal: 16 },
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  headerCard:  { alignItems: 'center' },
  barcodeRow:  { alignItems: 'center', paddingVertical: 8 },
  ctaRow:      { flexDirection: 'row', gap: 10 },
  ctaBtn:      { flex: 1 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 10 },
  medCard: { gap: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});
