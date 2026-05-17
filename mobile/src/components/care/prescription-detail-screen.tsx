import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_CONTENT_HEIGHT } from '../nav/tab-bar-metrics';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Chip } from '../primitives/chip';
import { Card } from '../primitives/card';
import { Button } from '../primitives/button';
import { TopBar } from '../layout/top-bar';
import { IconButton } from '../primitives/icon-button';
import { ApiState, MissingApiState } from '../api/api-state';
import { ChevronLeft, IconClock, IconPill, IconUser } from '../../icons';
import { BarcodePlaceholder } from './barcode-placeholder';
import { useApiQuery } from '../../api/query';
import { appointmentService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import { formatDate } from '../../api/viewModels';

export function PrescriptionDetailScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
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

      <ScrollView style={s.flex} contentContainerStyle={[s.content, { paddingBottom: TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16 }]}>
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
              <View style={s.headerRow}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[typography.title, { color: t.ink }]}>
                    {prescription.medicines[0]?.name ?? 'Prescription'}
                  </Text>
                  <Text style={[typography.caption, { color: t.ink3 }]}>
                    {prescription.diagnosis ?? 'Diagnosis not specified'}
                  </Text>
                </View>
                <View style={[s.rxIconBox, { backgroundColor: t.brandSoft, borderRadius: t.radius.md }]}>
                  <IconPill size={20} color={t.brand} />
                </View>
              </View>
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
                <View style={s.chipRow}>
                  <Chip label={medicine.dosage} variant="brand" />
                  <Chip label={medicine.frequency} variant="default" />
                  {medicine.duration && <Chip label={medicine.duration} variant="default" />}
                </View>
                {medicine.notes && (
                  <Text style={[typography.caption, { color: t.ink3, marginTop: 6 }]}>{medicine.notes}</Text>
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
            <View style={[s.barcodeCard, { backgroundColor: '#FFFFFF', borderColor: t.border, borderRadius: t.radius.lg }]}>
              <BarcodePlaceholder size={120} />
              <Text style={[typography.micro, { color: t.ink3, marginTop: 8 }]}>Show this code at pharmacy</Text>
            </View>

            {/* CTAs */}
            <View style={s.ctaRow}>
              <Button label="Share PDF" variant="ghost" style={s.ctaBtn} onPress={() => {}} />
              <Button label="Refill" variant="solid" style={s.ctaBtn} onPress={() => router.push(`/meds/import?appointmentId=${appointmentId}` as never)} />
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
  headerCard:  { gap: 10 },
  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rxIconBox:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  barcodeCard: { alignItems: 'center', paddingVertical: 20, borderWidth: StyleSheet.hairlineWidth },
  ctaRow:      { flexDirection: 'row', gap: 10, marginTop: 16 },
  ctaBtn:      { flex: 1 },
  chips:       { flexDirection: 'row', gap: 8 },
  chipRow:     { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  medCard:     { gap: 4 },
  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});
