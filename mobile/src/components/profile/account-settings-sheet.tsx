import React, { useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { Card } from '../primitives/card';
import { ApiState } from '../api/api-state';
import { IconDownload, IconRefresh, IconShield } from '../../icons';
import { accountExportService } from '../../api/services/account-export-service';
import { safeOpenUrl } from '../../utils/safe-url';
import { AccountDeletionCard } from './account-deletion-card';
import type { AccountDataExportRequest } from '../../../../shared/api-contracts';
import { useTranslation } from 'react-i18next';

const HANDLE_OFFSET = 12;

function formatDateTime(value: string | null) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatBytes(bytes: number | null) {
  if (bytes === null) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [exportRequest, setExportRequest] = useState<AccountDataExportRequest | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'request' | 'refresh' | 'download' | null>(null);

  async function requestExport() {
    setBusyAction('request');
    setError(null);
    setDownloadUrl(null);
    try {
      const request = await accountExportService.requestExport();
      setExportRequest(request);
      setStatusText(`Status: ${request.status}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request account export.');
    } finally {
      setBusyAction(null);
    }
  }

  async function refreshExportStatus() {
    if (!exportRequest) {
      setError('Request an archive first.');
      return;
    }
    setBusyAction('refresh');
    setError(null);
    try {
      const request = await accountExportService.exportStatus(exportRequest.id);
      setExportRequest(request);
      setStatusText(`Status: ${request.status}`);
      if (request.status === 'failed') setError(request.error || 'Account export failed.');
      if (request.status === 'completed') setDownloadUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh export status.');
    } finally {
      setBusyAction(null);
    }
  }

  async function openExportDownload() {
    if (!exportRequest || exportRequest.status !== 'completed') return;
    setBusyAction('download');
    setError(null);
    try {
      const download = await accountExportService.exportDownload(exportRequest.id);
      setDownloadUrl(download.url);
      const opened = await safeOpenUrl(download.url);
      if (!opened) setError('Could not open download link. URL must use HTTPS.');
      setStatusText(`Download ready: ${formatBytes(download.bytes)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open account export.');
    } finally {
      setBusyAction(null);
    }
  }

  const canDownload = exportRequest?.status === 'completed';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: t.card, borderTopLeftRadius: t.radius.xxl, borderTopRightRadius: t.radius.xxl }]}>
        <View style={[styles.handle, { backgroundColor: t.border }]} />
        <View style={styles.sheetHeader}>
          <Text style={[typography.h3, { color: t.ink }]}>Settings</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[typography.caption, { color: t.brand }]}>Close</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.blockCard}>
            <View style={styles.titleRow}>
              <View style={[styles.iconBox, { backgroundColor: t.brandSoft }]}>
                <IconShield size={18} color={t.brand} />
              </View>
              <View style={styles.titleText}>
                <Text style={[typography.bodyMed, { color: t.ink }]}>Account data export</Text>
                <Text style={[typography.micro, { color: t.ink3 }]}>Archive includes profile, health, medication, and audit data.</Text>
              </View>
            </View>

            {exportRequest && (
              <View style={[styles.statusBox, { borderColor: t.border, backgroundColor: t.bgElev }]}>
                <Text style={[typography.micro, { color: t.ink2 }]}>Requested {formatDateTime(exportRequest.requested_at)}</Text>
                <Text style={[typography.micro, { color: t.ink3 }]}>Expires {formatDateTime(exportRequest.expires_at)}</Text>
                <Text style={[typography.micro, { color: t.ink3 }]}>Size {formatBytes(exportRequest.bytes)}</Text>
              </View>
            )}

            {statusText && <Text style={[typography.micro, { color: t.success }]}>{statusText}</Text>}
            {downloadUrl && <Text style={[typography.micro, { color: t.ink3 }]} numberOfLines={1}>{downloadUrl}</Text>}
            {error && <ApiState title="Account export unavailable" message={error} />}

            <View style={styles.buttonRow}>
              <Button
                label={busyAction === 'request' ? 'Requesting...' : 'Request archive'}
                variant="solid"
                icon={<IconDownload size={16} color="#FFF" />}
                onPress={requestExport}
                disabled={busyAction !== null}
              />
              <Button
                label={i18n('common.retry')}
                variant="ghost"
                icon={<IconRefresh size={16} color={t.ink} />}
                onPress={refreshExportStatus}
                disabled={busyAction !== null || !exportRequest}
              />
            </View>
            <Button
              label={busyAction === 'download' ? 'Opening...' : 'Open download'}
              variant="soft"
              onPress={openExportDownload}
              disabled={busyAction !== null || !canDownload}
            />
          </Card>
          <AccountDeletionCard onDeleted={onClose} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { paddingBottom: 40, maxHeight: '92%' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: HANDLE_OFFSET },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', margin: 20, marginBottom: 12 },
  content: { padding: 16, gap: 12 },
  blockCard: { gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  titleText: { flex: 1, minWidth: 0 },
  statusBox: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 4 },
  buttonRow: { gap: 10 },
});
