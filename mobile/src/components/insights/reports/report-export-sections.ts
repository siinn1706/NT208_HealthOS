export type ReportExportSectionKey = 'vitals' | 'medication' | 'nutrition' | 'activity' | 'sleep' | 'bmi';

export interface ReportExportSectionRow {
  key: ReportExportSectionKey;
  label: string;
  sub: string;
  sensitive: boolean;
}

const EXPORTABLE_SECTION_KEYS: ReadonlySet<string> = new Set([
  'vitals',
  'medication',
  'nutrition',
  'activity',
  'sleep',
  'bmi',
]);

const SENSITIVE_SECTION_KEYS: ReadonlySet<ReportExportSectionKey> = new Set(['medication']);

const DEFAULT_SECTION_LABELS: Record<ReportExportSectionKey, string> = {
  vitals: 'Vitals trends',
  medication: 'Medication adherence',
  nutrition: 'Meals & nutrition',
  activity: 'Activity',
  sleep: 'Sleep',
  bmi: 'BMI',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function isExportSectionKey(value: unknown): value is ReportExportSectionKey {
  return typeof value === 'string' && EXPORTABLE_SECTION_KEYS.has(value);
}

function averageSummary(stats: unknown, periodCopy: string): string | null {
  if (!isRecord(stats) || typeof stats.average !== 'number') return null;
  const unit = nonEmptyString(stats.unit);
  const rounded = Number.isInteger(stats.average) ? stats.average : Number(stats.average.toFixed(1));
  return `Avg ${rounded}${unit ? ` ${unit}` : ''} - ${periodCopy}`;
}

export function isSensitiveReportSection(key: string): key is ReportExportSectionKey {
  return SENSITIVE_SECTION_KEYS.has(key as ReportExportSectionKey);
}

export function normalizeReportExportSections(
  report: unknown,
  periodCopy: string,
  labels: Partial<Record<ReportExportSectionKey, string>> = {},
): ReportExportSectionRow[] {
  const data = isRecord(report) ? report : {};
  const sections = Array.isArray(data.sections) ? data.sections : [];
  const seen = new Set<ReportExportSectionKey>();

  return sections.reduce<ReportExportSectionRow[]>((rows, rawSection) => {
    const section = isRecord(rawSection) ? rawSection : {};
    const key = section.category;
    if (!isExportSectionKey(key) || seen.has(key)) return rows;
    seen.add(key);

    const label = nonEmptyString(section.title) ?? labels[key] ?? DEFAULT_SECTION_LABELS[key];
    const summary = nonEmptyString(section.summary)
      ?? averageSummary(section.stats, periodCopy)
      ?? periodCopy;

    rows.push({
      key,
      label,
      sub: summary,
      sensitive: SENSITIVE_SECTION_KEYS.has(key),
    });
    return rows;
  }, []);
}
