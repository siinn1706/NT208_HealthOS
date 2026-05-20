import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Toggle } from '../../primitives/toggle';
import { reportService } from '../../../api/services';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { IconHeartPulse, IconPaperclip, IconUser, IconShield } from '../../../icons';
import { safeOpenUrl } from '../../../utils/safe-url';

// ─── Types ────────────────────────────────────────────────────────────────────

type ExportFormat = 'pdf' | 'csv' | 'summary';
type Dest = 'doctor' | 'pdf' | 'link' | 'family';

interface IncludeToggles {
  vitals: boolean;
  medication: boolean;
  sleep: boolean;
  meals: boolean;
  ai: boolean;
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function ReportExportScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();

  // Format state kept for export logic compatibility
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [exporting, setExporting] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  // Destination tile selection
  const [dest, setDest] = useState<Dest>('pdf');

  // Include toggles
  const [includes, setIncludes] = useState<IncludeToggles>({
    vitals: true,
    medication: true,
    sleep: true,
    meals: false,
    ai: true,
  });

  // ─── Async handlers (all original logic preserved) ────────────────────────

  async function pollUntilReady(nextRequestId: string) {
    for (let i = 0; i < 20; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const status = await reportService.pdfStatus(nextRequestId);
      setStatusText(`Status: ${status.status}`);
      if (status.status === 'completed') return status.id;
      if (status.status === 'failed') {
        throw new Error(status.error || 'Report export failed.');
      }
    }
    throw new Error('Report export still processing. Please try again in a moment.');
  }

  async function handleExport() {
    if (format !== 'pdf') {
      setError('Only PDF export is available right now.');
      return;
    }
    setExporting(true);
    setError(null);
    setStatusText('Requesting PDF export…');
    setDownloadUrl(null);
    try {
      const req = await reportService.requestPdf({
        period: '7d',
        sections: ['vitals', 'nutrition', 'activity', 'sleep', 'bmi', 'medication'],
        locale: 'en',
        include_sensitive: false,
      });
      setRequestId(req.id);
      setStatusText(`Status: ${req.status}`);
      const readyId = await pollUntilReady(req.id);
      const download = await reportService.pdfDownload(readyId);
      setDownloadUrl(download.url);
      setStatusText('PDF ready. Open link to download.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export report.');
    } finally {
      setExporting(false);
    }
  }

  async function handleOpenDownload() {
    if (!downloadUrl) return;
    const opened = await safeOpenUrl(downloadUrl);
    if (!opened) setError('Could not open download link. URL must use HTTPS.');
  }

  async function handleRefreshStatus() {
    if (!requestId) {
      setError('No export request found yet.');
      return;
    }
    setError(null);
    try {
      const status = await reportService.pdfStatus(requestId);
      setStatusText(`Status: ${status.status}`);
      if (status.status === 'completed') {
        const download = await reportService.pdfDownload(requestId);
        setDownloadUrl(download.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh export status.');
    }
  }

  // ─── Destination tile config ───────────────────────────────────────────────

  const destinations: { key: Dest; label: string; Icon: React.ComponentType<{ size: number; color: string }> }[] = [
    { key: 'doctor', label: 'Doctor',  Icon: IconHeartPulse },
    { key: 'pdf',    label: 'PDF',     Icon: IconPaperclip  },
    { key: 'link',   label: 'Link',    Icon: IconShield     },
    { key: 'family', label: 'Family',  Icon: IconUser       },
  ];

  // ─── Include rows config ──────────────────────────────────────────────────

  const includeRows: { key: keyof IncludeToggles; label: string; sub: string }[] = [
    { key: 'vitals',     label: 'Vitals trends',         sub: 'HR, BP, glucose · last 7 days'  },
    { key: 'medication', label: 'Medication adherence',  sub: '14 of 14 doses'                 },
    { key: 'sleep',      label: 'Sleep',                 sub: '7 nights, avg 7h 12m'           },
    { key: 'meals',      label: 'Meals & nutrition',     sub: '21 meals, sodium flagged'       },
    { key: 'ai',         label: 'AI recommendations',    sub: '3 items'                        },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      {/* Ghost report preview behind sheet */}
      <View style={styles.previewArea}>
        <View style={styles.previewCard}>
          <Text style={[typography.caption, { color: 'rgba(255,255,255,0.4)' }]}>Weekly report preview</Text>
        </View>
      </View>

      {/* Bottom sheet panel */}
      <View style={styles.sheet}>
        {/* Drag handle */}
        <View style={styles.handle} />

        {/* Title */}
        <Text style={[typography.h3, { color: '#111' }]}>{i18n('insights.shareReport')}</Text>
        <Text style={[typography.caption, { color: '#888', marginTop: 4, marginBottom: 20 }]}>Apr 18 – Apr 24</Text>

        {/* Destination tiles */}
        <View style={styles.destRow}>
          {destinations.map(({ key, label, Icon }) => {
            const active = dest === key;
            return (
              <Pressable
                key={key}
                onPress={() => setDest(key)}
                style={[
                  styles.destTile,
                  {
                    backgroundColor: active ? t.brand : '#F5F5F5',
                    borderColor: active ? t.brand : '#E0E0E0',
                  },
                ]}
              >
                <Icon size={20} color={active ? '#fff' : '#666'} />
                <Text style={[typography.caption, { color: active ? '#fff' : '#666', marginTop: 6, fontWeight: '600' }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Include toggles */}
        <Text style={[typography.micro, { color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }]}>
          {i18n('insights.whatToInclude')}
        </Text>
        <View style={styles.includeList}>
          {includeRows.map(({ key, label, sub }, idx) => (
            <View
              key={key}
              style={[
                styles.includeRow,
                {
                  borderBottomWidth: idx < includeRows.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: '#E0E0E0',
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyMed, { color: '#111' }]}>{label}</Text>
                <Text style={[typography.caption, { color: '#888', marginTop: 2 }]}>{sub}</Text>
              </View>
              <Toggle
                value={includes[key]}
                onChange={(v) => setIncludes((prev) => ({ ...prev, [key]: v }))}
              />
            </View>
          ))}
        </View>

        {/* Info note */}
        <View style={styles.infoNote}>
          <IconShield size={16} color={t.brand} />
          <Text style={[typography.caption, { color: '#444', flex: 1, lineHeight: 18 }]}>
            Identifying info (name, DOB) is included only when sharing with your care team. Link sharing is read-only and expires in 7 days.
          </Text>
        </View>

        {/* Status / error feedback */}
        {statusText && (
          <Text style={[typography.caption, { color: t.brand, marginBottom: 8, textAlign: 'center' }]}>
            {statusText}
          </Text>
        )}
        {error && (
          <Text style={[typography.caption, { color: t.danger, marginBottom: 8, textAlign: 'center' }]}>
            {error}
          </Text>
        )}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Pressable onPress={() => router.back()} style={styles.cancelBtn}>
            <Text style={[typography.button, { color: '#333' }]}>{i18n('common.cancel')}</Text>
          </Pressable>
          <Pressable
            onPress={exporting ? undefined : handleExport}
            style={[styles.shareBtn, { backgroundColor: exporting ? t.brand + '80' : t.brand }]}
          >
            {exporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[typography.button, { color: '#fff' }]}>{i18n('insights.sharePdf')}</Text>
            )}
          </Pressable>
        </View>

        {/* Open download link if available */}
        {downloadUrl && (
          <Pressable onPress={handleOpenDownload} style={{ marginTop: 12, alignItems: 'center' }}>
            <Text style={[typography.caption, { color: t.brand }]}>{i18n('insights.openDownload')}</Text>
          </Pressable>
        )}

        {/* Refresh status link if request started */}
        {requestId && !downloadUrl && (
          <Pressable onPress={handleRefreshStatus} style={{ marginTop: 8, alignItems: 'center' }}>
            <Text style={[typography.caption, { color: t.brand }]}>{i18n('insights.refreshStatus')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  previewArea: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCard: {
    width: '85%',
    height: 120,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 16,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  destRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  destTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  includeList: {
    backgroundColor: '#F8F8F8',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  includeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  infoNote: {
    backgroundColor: '#EEF4FF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    flex: 2,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
