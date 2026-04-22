import type { DashboardAiInsight, DashboardAlert, KpiValue } from "@/api/endpoints/dashboard";
import type { NutritionSuggestion } from "@/api/endpoints/nutrition";
import type { ReminderRepeat, ReminderType } from "@/api/endpoints/reminders";
import type { AlertBannerTone } from "@/components/dashboard/alert-banner";

export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

const KPI_LABEL_KEYS: Record<string, string> = {
  steps: "home.kpiSteps",
  heart_rate: "home.kpiHeartRate",
  sleep_minutes: "home.kpiSleep",
  weight_kg: "home.kpiWeight",
  blood_pressure_systolic: "home.kpiSystolic",
  blood_pressure_diastolic: "home.kpiDiastolic",
};

const KPI_UNITS: Record<string, string> = {
  steps: "",
  heart_rate: "bpm",
  sleep_minutes: "min",
  weight_kg: "kg",
  blood_pressure_systolic: "mmHg",
  blood_pressure_diastolic: "mmHg",
};

const PREFERRED_KPI_KEYS = ["steps", "heart_rate", "sleep_minutes", "weight_kg"] as const;
const FALLBACK_KPI_KEYS = ["blood_pressure_systolic", "blood_pressure_diastolic"] as const;

export function inferAlertTone(type: string): AlertBannerTone {
  const lower = type.toLowerCase();
  if (lower.includes("danger") || lower.includes("critical") || lower.includes("error")) {
    return "danger";
  }
  if (lower.includes("warn")) return "warning";
  if (lower.includes("info") || lower.includes("notice")) return "info";
  return "neutral";
}

export function alertBadgeLabel(alert: DashboardAlert, t: TranslateFn): string {
  const code = alert.alert_code?.trim();
  if (code) {
    const key = `home.alertCode.${code}`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  const tone = inferAlertTone(alert.type);
  const toneKey = `home.alertBadge.${tone}`;
  const toneLabel = t(toneKey);
  if (toneLabel !== toneKey) return toneLabel;
  return t("home.alertBadge.fallback");
}

export function mapAlertsForBanner(alerts: DashboardAlert[], t: TranslateFn) {
  return alerts.map((a) => ({
    id: a.id,
    tone: inferAlertTone(a.type),
    label: alertBadgeLabel(a, t),
    message: a.message,
  }));
}

export function selectHomeKpiKeys(kpis: Record<string, KpiValue> | undefined): string[] {
  if (!kpis || typeof kpis !== "object") return [];
  const picked: string[] = [];
  for (const k of PREFERRED_KPI_KEYS) {
    if (Object.prototype.hasOwnProperty.call(kpis, k)) picked.push(k);
    if (picked.length >= 4) return picked;
  }
  for (const k of FALLBACK_KPI_KEYS) {
    if (Object.prototype.hasOwnProperty.call(kpis, k) && !picked.includes(k)) picked.push(k);
    if (picked.length >= 4) return picked;
  }
  return picked;
}

export function kpiLabelForMetric(metricKey: string, t: TranslateFn): string {
  const labelKey = KPI_LABEL_KEYS[metricKey];
  return labelKey ? t(labelKey) : metricKey.replace(/_/g, " ");
}

export function kpiUnitForMetric(metricKey: string): string {
  return KPI_UNITS[metricKey] ?? "";
}

export function formatKpiValueDisplay(current: number | null | undefined): string {
  if (current === null || current === undefined) return "—";
  return Number.isInteger(current) ? String(current) : current.toFixed(1);
}

export function nutritionSuggestionTitle(s: NutritionSuggestion, t: TranslateFn): string {
  const typeKey = `home.nutritionType.${s.type}`;
  const typeLabel = t(typeKey);
  if (typeLabel !== typeKey) return `${typeLabel}: ${s.title}`;
  return s.title;
}

export function reminderTypeLabel(type: ReminderType, t: TranslateFn): string {
  const key = `home.reminderType.${type}`;
  const translated = t(key);
  return translated !== key ? translated : t("home.reminderType.other");
}

export function reminderRepeatLabel(repeat: ReminderRepeat, t: TranslateFn): string {
  const key = `home.reminderRepeat.${repeat}`;
  const translated = t(key);
  return translated !== key ? translated : repeat;
}

export function insightPrimaryBadgeLabel(insight: DashboardAiInsight | null | undefined, t: TranslateFn): string {
  if (!insight) return t("home.aiInsight");
  const cat = insight.category?.trim();
  if (cat) {
    const key = `home.insightCategory.${cat}`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  const code = insight.insight_code?.trim();
  if (code) {
    const key = `home.insightCode.${code}`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  return t("home.aiInsight");
}

export function goalKeyLabel(key: string, t: TranslateFn): string {
  const k = `home.goalKey.${key}`;
  const translated = t(k);
  return translated !== k ? translated : key.replace(/_/g, " ");
}
