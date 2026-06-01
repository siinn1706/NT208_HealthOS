import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Card } from '../primitives/card';
import { Button } from '../primitives/button';
import { IconButton } from '../primitives/icon-button';
import { ApiState } from '../api/api-state';
import { IconDownload, IconFileText, IconPaperclip, IconTrash } from '../../icons';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { appointmentAssetService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import { safeOpenUrl } from '../../utils/safe-url';
import { validateDocumentFile } from '../../utils/file-validation';
import type { AppointmentAssetKind } from '../../../../shared/api-contracts';

interface AppointmentAssetsCardProps {
  appointmentId: string;
  kind?: AppointmentAssetKind;
  title?: string;
  helperText?: string;
  emptyMessage?: string;
  showTitle?: boolean;
  allowUpload?: boolean;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AppointmentAssetsCard({
  appointmentId,
  kind = 'attachment',
  title,
  helperText,
  emptyMessage,
  showTitle = true,
  allowUpload = true,
}: AppointmentAssetsCardProps) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [assetBusyId, setAssetBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const queryKey = queryKeys.appointmentAssets(appointmentId, kind);
  const loadAssets = useCallback(() => appointmentAssetService.list(appointmentId, { kind }), [appointmentId, kind]);
  const assetsQuery = useApiQuery(queryKey, loadAssets, { enabled: Boolean(appointmentId) });
  const resolvedTitle = title ?? i18n('care.appointmentFiles');
  const resolvedEmptyMessage = emptyMessage ?? i18n('care.appointmentFilesEmpty');

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
      const validation = validateDocumentFile({
        uri: asset.uri,
        fileName: asset.name,
        mimeType: asset.mimeType,
        fileSize: asset.size,
      });
      if (!validation.ok) {
        setAssetError(i18n(validation.messageKey ?? 'validation.document.bad_mime', validation.messageParams));
        return;
      }
      await appointmentAssetService.upload(appointmentId, {
        uri: asset.uri,
        name: asset.name ?? 'appointment-asset',
        type: asset.mimeType ?? 'application/pdf',
      }, kind);
      invalidateApiQuery(queryKey);
      await assetsQuery.reload();
    } catch (err) {
      setAssetError(err instanceof Error ? err.message : i18n('care.appointmentFileUploadFailed'));
    } finally {
      setUploading(false);
    }
  }

  async function handleOpenAsset(assetId: string) {
    setAssetBusyId(assetId);
    setAssetError(null);
    try {
      const signed = await appointmentAssetService.signedUrl(appointmentId, assetId);
      const opened = await safeOpenUrl(signed.url);
      if (!opened) setAssetError(i18n('care.appointmentFileOpenSignedUrlFailed'));
    } catch (err) {
      setAssetError(err instanceof Error ? err.message : i18n('care.appointmentFileOpenFailed'));
    } finally {
      setAssetBusyId(null);
    }
  }

  async function handleDeleteAsset(assetId: string) {
    setAssetBusyId(assetId);
    setAssetError(null);
    try {
      await appointmentAssetService.remove(appointmentId, assetId);
      invalidateApiQuery(queryKey);
      await assetsQuery.reload();
    } catch (err) {
      setAssetError(err instanceof Error ? err.message : i18n('care.appointmentFileDeleteFailed'));
    } finally {
      setAssetBusyId(null);
    }
  }

  return (
    <View style={styles.wrap}>
      {showTitle && <Text style={[typography.h3, { color: t.ink }]}>{resolvedTitle}</Text>}
      <Card style={styles.card}>
        {helperText && <Text style={[typography.caption, { color: t.ink3 }]}>{helperText}</Text>}
        {allowUpload && (
          <Button
            label={uploading ? i18n('care.uploadingAppointmentFile') : i18n('care.uploadAppointmentFile')}
            variant="ghost"
            icon={<IconPaperclip size={16} color={t.ink2} />}
            onPress={handleUploadAsset}
            loading={uploading}
            accessibilityHint={i18n('care.uploadAppointmentFileHint')}
          />
        )}
        {assetError && <Text style={[typography.caption, { color: t.danger }]}>{assetError}</Text>}
        {assetsQuery.isLoading && <ApiState title={i18n('care.loadingAppointmentFiles')} loading />}
        {assetsQuery.error && (
          <ApiState
            title={i18n('care.appointmentFilesUnavailable')}
            message={assetsQuery.error.message}
            actionLabel={i18n('common.retry')}
            onAction={assetsQuery.reload}
          />
        )}
        {!assetsQuery.isLoading && !assetsQuery.error && (assetsQuery.data ?? []).length === 0 && (
          <ApiState title={i18n('care.noAppointmentFiles')} message={resolvedEmptyMessage} />
        )}
        {!assetsQuery.isLoading && !assetsQuery.error && (assetsQuery.data ?? []).map((asset) => (
          <View key={asset.id} style={[styles.assetRow, { borderColor: t.border, borderRadius: t.radius.md }]}>
            <View style={[styles.assetIcon, { backgroundColor: t.brandSoft, borderRadius: t.radius.sm }]}>
              <IconFileText size={16} color={t.brand} />
            </View>
            <View style={styles.assetText}>
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
              disabled={assetBusyId === asset.id}
              icon={<IconDownload size={16} color={t.ink2} />}
              accessibilityLabel={i18n('care.openAppointmentFile')}
              accessibilityHint={i18n('care.openAppointmentFileHint')}
              onPress={() => handleOpenAsset(asset.id)}
            />
            <IconButton
              size={34}
              variant="subtle"
              disabled={assetBusyId === asset.id}
              icon={<IconTrash size={16} color={t.danger} />}
              accessibilityLabel={i18n('care.deleteAppointmentFile')}
              accessibilityHint={i18n('care.deleteAppointmentFileHint')}
              onPress={() => handleDeleteAsset(asset.id)}
            />
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  card: { gap: 10 },
  assetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth, padding: 10 },
  assetIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  assetText: { flex: 1, gap: 2 },
});
