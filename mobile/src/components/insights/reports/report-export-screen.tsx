import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ApiState } from '../../api/api-state';
import { Toggle } from '../../primitives/toggle';
import { useApiQuery } from '../../../api/query';
import { queryKeys } from '../../../api/queryKeys';
import { reportService } from '../../../api/services';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { IconPaperclip, IconShield } from '../../../icons';
import { safeOpenUrl } from '../../../utils/safe-url';
import {
  isSensitiveReportSection,
  normalizeReportExportSections,
  type ReportExportSectionKey,
} from './report-export-sections';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportPeriod = '7d' | '30d' | '90d';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePeriod(value: string | undefined): ReportPeriod {
  return value === '30d' || value === '90d' || value === '7d' ? value : '7d';
}

function normalizeLocale(value: string | undefined): 'en' | 'vi' {
  return value?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

function periodDays(period: ReportPeriod) {
  if (period === '90d') return 90;
  if (period === '30d') return 30;
  return 7;
}

function periodCopyLabel(period: ReportPeriod, locale: 'en' | 'vi') {
  if (locale === 'vi') {
    if (period === '90d') return '90 ngày qua';
    if (period === '30d') return '30 ngày qua';
    return '7 ngày qua';
  }
  if (period === '90d') return 'last 90 days';
  if (period === '30d') return 'last 30 days';
  return 'last 7 days';
}

function periodRangeLabel(period: ReportPeriod, locale: 'en' | 'vi') {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - periodDays(period) + 1);
  const format = (date: Date) => date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
  return `${format(start)} - ${format(end)}`;
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function ReportExportScreen() {
  const t = useTheme();
  const { t: i18n, i18n: i18next } = useTranslation();
  const params = useLocalSearchParams<{ period?: string | string[] }>();
  const period = normalizePeriod(firstParam(params.period));
  const locale = normalizeLocale(i18next.language);
  const rangeLabel = periodRangeLabel(period, locale);
  const periodCopy = periodCopyLabel(period, locale);

  const [exporting, setExporting] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const loadReport = useCallback(() => reportService.get(period), [period]);
  const report = useApiQuery(queryKeys.reports(period), loadReport);

  const sectionLabels = useMemo<Partial<Record<ReportExportSectionKey, string>>>(() => ({
    vitals: i18n('insights.exportSectionVitals'),
    medication: i18n('insights.exportSectionMedication'),
    nutrition: i18n('insights.exportSectionNutrition'),
    activity: i18n('insights.exportSectionActivity'),
    sleep: i18n('insights.exportSectionSleep'),
    bmi: i18n('insights.exportSectionBmi'),
  }), [i18n]);

  const includeRows = useMemo(
    () => normalizeReportExportSections(report.data, periodCopy, sectionLabels),
    [periodCopy, report.data, sectionLabels],
  );
  const sectionKeySignature = includeRows.map((row) => row.key).join('|');

  const [selectedSectionKeys, setSelectedSectionKeys] = useState<ReportExportSectionKey[]>([]);
  const [includeSensitive, setIncludeSensitive] = useState(false);

  useEffect(() => {
    const nextKeys = sectionKeySignature
      ? sectionKeySignature.split('|') as ReportExportSectionKey[]
      : [];
    setSelectedSectionKeys(nextKeys);
    setIncludeSensitive(false);
  }, [sectionKeySignature]);

  const selectedSensitiveSections = selectedSectionKeys.filter(isSensitiveReportSection);

  function toggleSection(key: ReportExportSectionKey, enabled: boolean) {
    setSelectedSectionKeys((prev) => {
      if (enabled) return prev.includes(key) ? prev : [...prev, key];
      return prev.filter((existing) => existing !== key);
    });
  }

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
    if (report.isLoading) {
      setError(i18n('insights.reportSectionsLoading'));
      return;
    }
    if (report.error) {
      setError(report.error.message);
      return;
    }
    if (includeRows.length === 0) {
      setError(i18n('insights.exportSectionsUnavailable'));
      return;
    }
    const sections = selectedSectionKeys;
    if (sections.length === 0) {
      setError(i18n('insights.selectAtLeastOneReportSection'));
      return;
    }
    if (selectedSensitiveSections.length > 0 && !includeSensitive) {
      setError(i18n('insights.sensitiveSectionsBlocked'));
      return;
    }
    setExporting(true);
    setError(null);
    setStatusText('Requesting PDF export…');
    setDownloadUrl(null);
    try {
      const req = await reportService.requestPdf({
        period,
        sections,
        locale,
        include_sensitive: includeSensitive,
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
        <Text style={[typography.caption, { color: '#888', marginTop: 4, marginBottom: 20 }]}>{rangeLabel}</Text>

        {/* PDF destination */}
        <View style={[styles.pdfDestination, { borderColor: '#E0E0E0', backgroundColor: '#F8F8F8' }]}>
          <View style={[styles.pdfIcon, { backgroundColor: t.brand + '18' }]}>
            <IconPaperclip size={20} color={t.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyMed, { color: '#111' }]}>{i18n('insights.exportPdf')}</Text>
            <Text style={[typography.caption, { color: '#888', marginTop: 2 }]}>
              {i18n('insights.pdfOnlyDestination')}
            </Text>
          </View>
        </View>

        {/* Include toggles */}
        <Text style={[typography.micro, { color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }]}>
          {i18n('insights.whatToInclude')}
        </Text>
        {report.isLoading && <ApiState title={i18n('api.loading')} loading />}
        {report.error && (
          <ApiState
            title={i18n('api.unavailable')}
            message={report.error.message}
            actionLabel={i18n('common.retry')}
            onAction={() => { void report.reload(); }}
          />
        )}
        {!report.isLoading && !report.error && includeRows.length === 0 && (
          <ApiState
            title={i18n('insights.exportSectionsUnavailable')}
            message={i18n('insights.exportSectionsUnavailableMessage')}
          />
        )}
        {includeRows.length > 0 && (
          <View style={styles.includeList}>
            {includeRows.map(({ key, label, sub, sensitive }, idx) => (
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
                  <Text style={[typography.caption, { color: '#888', marginTop: 2 }]}>
                    {sub}{sensitive ? ` · ${i18n('insights.sensitiveSection')}` : ''}
                  </Text>
                </View>
                <Toggle
                  value={selectedSectionKeys.includes(key)}
                  onChange={(v) => toggleSection(key, v)}
                />
              </View>
            ))}
          </View>
        )}

        {includeRows.length > 0 && (
          <View style={styles.sensitiveRow}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyMed, { color: '#111' }]}>{i18n('insights.includeSensitiveSections')}</Text>
              <Text style={[typography.caption, { color: '#888', marginTop: 2 }]}>
                {i18n('insights.includeSensitiveSectionsHint')}
              </Text>
            </View>
            <Toggle value={includeSensitive} onChange={setIncludeSensitive} />
          </View>
        )}

        {/* Info note */}
        <View style={styles.infoNote}>
          <IconShield size={16} color={t.brand} />
          <Text style={[typography.caption, { color: '#444', flex: 1, lineHeight: 18 }]}>
            {i18n('insights.exportPrivacyNote')}
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
  pdfDestination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
  },
  pdfIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  sensitiveRow: {
    backgroundColor: '#F8F8F8',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
