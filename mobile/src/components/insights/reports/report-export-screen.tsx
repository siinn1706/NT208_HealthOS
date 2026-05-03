// Export / share sheet for a health report
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../layout/Screen';
import { Card } from '../../primitives/Card';
import { Button } from '../../primitives/Button';
import { ApiState } from '../../api/ApiState';
import { reportService } from '../../../api/services';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { ChevronLeft, ChevronRight, IconPaperclip } from '../../../icons';

// ─── BackBar ─────────────────────────────────────────────────────────────────

function BackBar({ title }: { title: string }) {
  const t = useTheme();
  return (
    <View style={styles.backBar}>
      <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
        <ChevronLeft size={24} color={t.ink} />
      </Pressable>
      <Text style={[typography.h3, { flex: 1, color: t.ink }]} numberOfLines={1}>{title}</Text>
    </View>
  );
}

// ─── Format segmented control ────────────────────────────────────────────────

type ExportFormat = 'pdf' | 'csv' | 'summary';
const FORMATS: { key: ExportFormat; label: string }[] = [
  { key: 'pdf',     label: 'PDF'     },
  { key: 'csv',     label: 'CSV'     },
  { key: 'summary', label: 'Summary' },
];

function FormatPicker({ value, onChange }: { value: ExportFormat; onChange: (f: ExportFormat) => void }) {
  const t = useTheme();
  return (
    <View style={[styles.formatRow, { backgroundColor: t.brandSoft, borderRadius: t.radius.md }]}>
      {FORMATS.map((f) => {
        const active = f.key === value;
        return (
          <Pressable
            key={f.key}
            onPress={() => onChange(f.key)}
            style={[styles.formatTab, { borderRadius: t.radius.sm }, active && { backgroundColor: t.card }]}
          >
            <Text style={[typography.chip, { color: active ? t.ink : t.ink3 }]}>{f.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Share option row ────────────────────────────────────────────────────────

interface ShareOptionProps { label: string; sub: string; onPress: () => void; disabled?: boolean; }

function ShareOption({ label, sub, onPress, disabled }: ShareOptionProps) {
  const t = useTheme();
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={[styles.shareRow, { borderBottomColor: t.border, opacity: disabled ? 0.45 : 1 }]}>
      <View style={styles.shareText}>
        <Text style={[typography.bodyMed, { color: t.ink }]}>{label}</Text>
        <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>{sub}</Text>
      </View>
      <ChevronRight size={18} color={t.ink3} />
    </Pressable>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function ReportExportScreen() {
  const t = useTheme();
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [exporting, setExporting] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

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
    try {
      await Linking.openURL(downloadUrl);
    } catch {
      setError('Could not open download link.');
    }
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

  return (
    <Screen>
      <BackBar title="Export report" />

      <Text style={[typography.caption, { color: t.ink3, marginBottom: 10, marginTop: 4 }]}>
        Weekly summary · Apr 18–24
      </Text>

      {/* Format picker */}
      <Text style={[typography.bodyMed, { color: t.ink, marginBottom: 8 }]}>Format</Text>
      <FormatPicker value={format} onChange={setFormat} />

      <View style={[styles.formatDesc, { backgroundColor: t.brandSoft, borderRadius: t.radius.md, marginTop: 8 }]}>
        {format === 'pdf' && (
          <Text style={[typography.caption, { color: t.ink3 }]}>
            PDF includes charts, vitals, AI summary — formatted for sharing with clinicians.
          </Text>
        )}
        {format === 'csv' && (
          <Text style={[typography.caption, { color: t.ink3 }]}>
            CSV exports raw vitals data for spreadsheet analysis.
          </Text>
        )}
        {format === 'summary' && (
          <Text style={[typography.caption, { color: t.ink3 }]}>
            Plain-text summary — great for pasting into messages or notes.
          </Text>
        )}
      </View>

      {/* Share options */}
      <Text style={[typography.bodyMed, { color: t.ink, marginTop: 24, marginBottom: 8 }]}>Share options</Text>
      <Card tight>
        <ShareOption
          label="Open download link"
          sub={downloadUrl ? 'Open generated PDF URL' : 'Export PDF first'}
          onPress={handleOpenDownload}
          disabled={!downloadUrl}
        />
        <ShareOption
          label="Refresh export status"
          sub={requestId ? 'Check if PDF is ready' : 'No request started'}
          onPress={handleRefreshStatus}
          disabled={!requestId}
        />
        <ShareOption
          label="Back to reports"
          sub="Return without exporting"
          onPress={() => router.back()}
        />
      </Card>

      {statusText && (
        <View style={{ marginTop: 12 }}>
          <ApiState title="Export status" message={statusText} />
        </View>
      )}
      {error && (
        <View style={{ marginTop: 12 }}>
          <ApiState title="Export failed" message={error} />
        </View>
      )}

      {/* Export CTA */}
      <Button
        label={exporting ? 'Exporting...' : 'Export'}
        variant="solid"
        size="lg"
        icon={<IconPaperclip size={18} color="#fff" />}
        style={{ marginTop: 24 }}
        onPress={exporting ? undefined : handleExport}
        loading={exporting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, minHeight: 52 },
  backBtn:    { width: 40, alignItems: 'flex-start' },
  formatRow:  { flexDirection: 'row', padding: 4 },
  formatTab:  { flex: 1, alignItems: 'center', paddingVertical: 8 },
  formatDesc: { padding: 12 },
  shareRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  shareText:  { flex: 1 },
});
