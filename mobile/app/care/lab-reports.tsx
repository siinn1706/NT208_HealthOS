import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/layout/screen';
import { TopBar } from '../../src/components/layout/top-bar';
import { Card } from '../../src/components/primitives/card';
import { Button } from '../../src/components/primitives/button';
import { IconButton } from '../../src/components/primitives/icon-button';
import { ApiState } from '../../src/components/api/api-state';
import { IconDownload, IconFileText } from '../../src/icons';
import { useTheme } from '../../src/theme/useTheme';
import { typography } from '../../src/theme/typography';
import { appointmentAssetService } from '../../src/api/services';
import { queryKeys } from '../../src/api/queryKeys';
import { useApiQuery } from '../../src/api/query';
import { safeOpenUrl } from '../../src/utils/safe-url';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LabReportsScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const loadLabReports = useCallback(() => appointmentAssetService.listUser({ kind: 'lab_report', limit: 100 }), []);
  const labReports = useApiQuery(queryKeys.appointmentAssetsByKind('lab_report'), loadLabReports);

  async function handleOpen(appointmentId: string, assetId: string) {
    setBusyId(assetId);
    setOpenError(null);
    try {
      const signed = await appointmentAssetService.signedUrl(appointmentId, assetId);
      const opened = await safeOpenUrl(signed.url);
      if (!opened) setOpenError(i18n('care.appointmentFileOpenSignedUrlFailed'));
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : i18n('care.appointmentFileOpenFailed'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen>
      <TopBar title={i18n('care.labReports')} />
      {labReports.isLoading && <ApiState title={i18n('care.loadingLabReports')} loading />}
      {labReports.error && (
        <ApiState
          title={i18n('care.labReportsUnavailable')}
          message={labReports.error.message}
          actionLabel={i18n('common.retry')}
          onAction={labReports.reload}
        />
      )}
      {!labReports.isLoading && !labReports.error && (labReports.data ?? []).length === 0 && (
        <ApiState title={i18n('care.noLabReports')} message={i18n('care.noLabReportsMessage')} />
      )}
      {!labReports.isLoading && !labReports.error && (labReports.data ?? []).length > 0 && (
        <Card style={s.card}>
          {openError && <Text style={[typography.caption, { color: t.danger }]}>{openError}</Text>}
          {(labReports.data ?? []).map((asset) => (
            <View key={asset.id} style={[s.row, { borderColor: t.border, borderRadius: t.radius.md }]}>
              <View style={[s.icon, { backgroundColor: t.danger + '18', borderRadius: t.radius.sm }]}>
                <IconFileText size={16} color={t.danger} />
              </View>
              <View style={s.rowText}>
                <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>
                  {asset.original_filename ?? i18n('care.appointmentAssetFallback')}
                </Text>
                <Text style={[typography.micro, { color: t.ink3 }]}>
                  {asset.mime_type} | {formatBytes(asset.size_bytes)}
                </Text>
              </View>
              <IconButton
                size={34}
                variant="subtle"
                disabled={busyId === asset.id}
                icon={<IconDownload size={16} color={t.ink2} />}
                accessibilityLabel={i18n('care.openAppointmentFile')}
                onPress={() => handleOpen(asset.appointment_id, asset.id)}
              />
            </View>
          ))}
        </Card>
      )}
      <Button
        label={i18n('common.back')}
        variant="soft"
        style={{ marginHorizontal: 16, marginTop: 12 }}
        onPress={() => router.back()}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  card: { marginHorizontal: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth, padding: 10 },
  icon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
});
