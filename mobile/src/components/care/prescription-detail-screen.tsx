import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { TAB_BAR_CONTENT_HEIGHT } from '../nav/tab-bar-metrics';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Chip } from '../primitives/chip';
import { Card } from '../primitives/card';
import { Button } from '../primitives/button';
import { TopBar } from '../layout/top-bar';
import { IconButton } from '../primitives/icon-button';
import { ApiState } from '../api/api-state';
import { ChevronLeft, IconClock, IconDownload, IconFileText, IconPill, IconTrash, IconUser } from '../../icons';
import { BarcodePlaceholder } from './barcode-placeholder';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { appointmentService, prescriptionAssetService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import { formatDate } from '../../api/viewModels';
import { safeOpenUrl } from '../../utils/safe-url';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PrescriptionDetailScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const appointmentId = (Array.isArray(id) ? id[0] : id) ?? '';
  const loadAppointment = useCallback(() => appointmentService.detail(appointmentId), [appointmentId]);
  const appointmentQuery = useApiQuery(queryKeys.appointment(appointmentId), loadAppointment, { enabled: Boolean(appointmentId) });
  const loadAssets = useCallback(() => prescriptionAssetService.list(appointmentId), [appointmentId]);
  const assetsQuery = useApiQuery(queryKeys.prescriptionAssets(appointmentId), loadAssets, { enabled: Boolean(appointmentId) });
  const prescription = appointmentQuery.data?.prescription ?? null;
  const [assetBusyId, setAssetBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);

  async function handleUploadAsset() {
    if (!appointmentId || uploading) return;
    setUploading(true);
    setAssetError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      await prescriptionAssetService.upload(appointmentId, {
        uri: asset.uri,
        name: asset.name || 'prescription-asset',
        type: asset.mimeType || 'application/octet-stream',
      });
      invalidateApiQuery(queryKeys.prescriptionAssets(appointmentId));
      await assetsQuery.reload();
    } catch (err) {
      setAssetError(err instanceof Error ? err.message : 'Could not upload prescription file.');
    } finally {
      setUploading(false);
    }
  }

  async function handleOpenAsset(assetId: string) {
    setAssetBusyId(assetId);
    setAssetError(null);
    try {
      const signed = await prescriptionAssetService.signedUrl(appointmentId, assetId);
      const opened = await safeOpenUrl(signed.url);
      if (!opened) setAssetError('Could not open signed download URL.');
    } catch (err) {
      setAssetError(err instanceof Error ? err.message : 'Could not open prescription file.');
    } finally {
      setAssetBusyId(null);
    }
  }

  async function handleDeleteAsset(assetId: string) {
    setAssetBusyId(assetId);
    setAssetError(null);
    try {
      await prescriptionAssetService.remove(appointmentId, assetId);
      invalidateApiQuery(queryKeys.prescriptionAssets(appointmentId));
      await assetsQuery.reload();
    } catch (err) {
      setAssetError(err instanceof Error ? err.message : 'Could not delete prescription file.');
    } finally {
      setAssetBusyId(null);
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.bar}>
        <TopBar
          title={i18n('care.prescriptionDetail')}
          left={<IconButton icon={<ChevronLeft size={22} color={t.ink} />} onPress={() => router.back()} accessibilityLabel={i18n('common.back')} />}
        />
      </View>

      <ScrollView style={s.flex} contentContainerStyle={[s.content, { paddingBottom: TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16 }]}>
        {appointmentQuery.isLoading && <ApiState title={i18n('care.loadingAppointments')} loading />}
        {appointmentQuery.error && (
          <ApiState
            title={i18n('care.appointmentsUnavailable')}
            message={appointmentQuery.error.message}
            actionLabel={i18n('common.retry')}
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

            <Text style={[typography.h3, { color: t.ink, marginTop: 4, marginBottom: 4 }]}>Prescription files</Text>
            <Card style={s.assetCard}>
              <Button
                label={uploading ? 'Uploading...' : 'Upload prescription file'}
                variant="ghost"
                onPress={handleUploadAsset}
                loading={uploading}
              />
              {assetError && <Text style={[typography.caption, { color: t.danger }]}>{assetError}</Text>}
              {assetsQuery.isLoading && <ApiState title="Loading prescription files" loading />}
              {assetsQuery.error && (
                <ApiState
                  title="Prescription files unavailable"
                  message={assetsQuery.error.message}
                  actionLabel={i18n('common.retry')}
                  onAction={assetsQuery.reload}
                />
              )}
              {!assetsQuery.isLoading && !assetsQuery.error && (assetsQuery.data ?? []).length === 0 && (
                <ApiState title="No prescription files" message="Uploaded PDFs and images will appear here." />
              )}
              {!assetsQuery.isLoading && !assetsQuery.error && (assetsQuery.data ?? []).map((asset) => (
                <View key={asset.id} style={[s.assetRow, { borderColor: t.border, borderRadius: t.radius.md }]}>
                  <View style={[s.assetIcon, { backgroundColor: t.brandSoft, borderRadius: t.radius.sm }]}>
                    <IconFileText size={16} color={t.brand} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>
                      {asset.original_filename ?? 'Prescription asset'}
                    </Text>
                    <Text style={[typography.micro, { color: t.ink3 }]}>
                      {asset.mime_type} · {formatBytes(asset.size_bytes)}
                    </Text>
                  </View>
                  <IconButton
                    size={34}
                    variant="subtle"
                    disabled={assetBusyId === asset.id}
                    icon={<IconDownload size={16} color={t.ink2} />}
                    accessibilityLabel="Open prescription file"
                    onPress={() => handleOpenAsset(asset.id)}
                  />
                  <IconButton
                    size={34}
                    variant="subtle"
                    disabled={assetBusyId === asset.id}
                    icon={<IconTrash size={16} color={t.danger} />}
                    accessibilityLabel="Delete prescription file"
                    onPress={() => handleDeleteAsset(asset.id)}
                  />
                </View>
              ))}
            </Card>

            {/* CTAs */}
            <View style={s.ctaRow}>
              <Button label="Upload file" variant="ghost" style={s.ctaBtn} onPress={handleUploadAsset} loading={uploading} />
              <Button label={i18n('meds.refill')} variant="solid" style={s.ctaBtn} onPress={() => router.push(`/meds/import?appointmentId=${appointmentId}` as never)} />
            </View>
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
  assetCard:   { gap: 10 },
  assetRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth, padding: 10 },
  assetIcon:   { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
});
