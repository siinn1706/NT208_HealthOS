import type { HealthReport } from '../../../../../shared/api-contracts';

export type ReportPeriod = '7d' | '30d';
export type ReportSourceStatus = 'ok' | 'empty' | 'error';

export interface ReportSourceRow {
  label: string;
  period: ReportPeriod;
  status: ReportSourceStatus;
  note: string;
}

export function reportRecord(report: HealthReport | null | undefined): Record<string, unknown> {
  return report && typeof report === 'object' ? report : {};
}

export function reportSections(report: HealthReport | null | undefined): unknown[] {
  const sections = reportRecord(report).sections;
  return Array.isArray(sections) ? sections : [];
}

export function reportGeneratedAt(report: HealthReport | null | undefined): string | null {
  const generated = reportRecord(report).generated_at;
  return typeof generated === 'string' && generated.trim() ? generated : null;
}

export function reportGeneratedLabel(report: HealthReport | null | undefined) {
  const generated = reportGeneratedAt(report);
  if (!generated) return 'No generated timestamp from Core';
  return `Generated ${generated.slice(0, 10)}`;
}

export function reportSectionSummary(report: HealthReport | null | undefined, fallback: string) {
  const first = reportSections(report)[0];
  const summary = first && typeof first === 'object' ? (first as Record<string, unknown>).summary : null;
  return typeof summary === 'string' && summary.trim() ? summary : fallback;
}

export function monthlyReportStatus(report: HealthReport | null | undefined) {
  const sections = reportSections(report);
  if (sections.length > 0) {
    return {
      title: '30-day report ready',
      subtitle: `${reportGeneratedLabel(report)} | ${sections.length} sections from Core`,
    };
  }
  return {
    title: '30-day report not generated',
    subtitle: 'Generate this Core report on demand when enough health data exists.',
  };
}

export function reportSourceRows(input: {
  weekly: HealthReport | null | undefined;
  weeklyError: Error | null;
  monthly: HealthReport | null | undefined;
  monthlyError: Error | null;
}): ReportSourceRow[] {
  return [
    reportSourceRow('Weekly report', '7d', input.weekly, input.weeklyError),
    reportSourceRow('Monthly report', '30d', input.monthly, input.monthlyError),
  ];
}

function reportSourceRow(
  label: string,
  period: ReportPeriod,
  report: HealthReport | null | undefined,
  error: Error | null,
): ReportSourceRow {
  if (error) {
    return { label, period, status: 'error', note: error.message };
  }
  const sections = reportSections(report);
  if (sections.length === 0) {
    return { label, period, status: 'empty', note: 'Core returned no report sections yet.' };
  }
  return { label, period, status: 'ok', note: `${sections.length} sections | ${reportGeneratedLabel(report)}` };
}
