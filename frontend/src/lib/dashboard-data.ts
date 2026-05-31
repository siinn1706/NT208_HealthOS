import { headers } from "next/headers";

import { bffUrl } from "@/lib/server-bff-url";
import { dataSlice, type DataSlice } from "@/types/data-slice";

export interface DashboardSummary {
  userName: string;
  alerts: Array<{
    id: string;
    type: "critical" | "warning" | "info";
    message: string;
    alert_code?: string;
    alert_params?: Record<string, unknown>;
  }>;
  kpis: {
    caloriesBurned: { current: number | null; target: number | null };
    sleepScore: { current: number | null; target: number | null };
    heartRate: { current: number | null; target: number | null };
    steps: { current: number | null; target: number | null };
  };
  goals: Array<{
    id: string;
    key: "water" | "steps" | "calories";
    current: number | null;
    target: number | null;
    unit: string;
  }>;
  aiInsight: { text: string; category?: string; confidence?: number | null } | null;
}

export interface VitalPoint {
  date: string;
  heartRate?: number;
  systolic?: number;
  diastolic?: number;
}

export interface ExerciseSuggestion {
  id: string;
  type: "tip" | "warning" | "goal" | "success";
  icon: string;
  title: string;
  message: string;
  message_params?: Record<string, number | string>;
  priority: number;
  duration_minutes: number | null;
  intensity: "low" | "medium" | "high";
  category: "cardio" | "strength" | "flexibility" | "balance";
  /** "ai" = title/message are plain text; "rule" = title/message are i18n keys */
  source?: "ai" | "rule";
}

export interface ReminderItem {
  id: string;
  type: "medicine" | "appointment" | "exercise";
  title: string;
  time: string;
  done?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function numOrNull(value: any): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function hasNullableNumberField(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key) && isNullableNumber(value[key]);
}

const KPI_KEYS = ["caloriesBurned", "sleepScore", "heartRate", "steps"] as const;
type DashboardKpiKey = (typeof KPI_KEYS)[number];

type DashboardSummaryWire = Record<string, unknown> & {
  user_name: string;
  alerts: Record<string, unknown>[];
  kpis: Record<DashboardKpiKey, { current: number | null; target: number | null }>;
  goals: Record<string, unknown>[];
};

function isValidKpiValue(value: unknown): value is { current: number | null; target: number | null } {
  if (!isRecord(value)) return false;
  return hasNullableNumberField(value, "current") && hasNullableNumberField(value, "target");
}

function isValidAlert(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.message === "string" &&
    (value.type === "critical" || value.type === "warning" || value.type === "info")
  );
}

function isValidGoal(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    (value.key === "water" || value.key === "steps" || value.key === "calories") &&
    hasNullableNumberField(value, "current") &&
    hasNullableNumberField(value, "target") &&
    typeof value.unit === "string"
  );
}

function isValidAiInsight(value: unknown): value is Record<string, unknown> | null | undefined {
  if (value === null || value === undefined) return true;
  if (!isRecord(value) || typeof value.text !== "string") return false;
  return value.category === null || value.category === undefined || typeof value.category === "string";
}

function hasDashboardSummaryShape(value: unknown): value is DashboardSummaryWire {
  if (!isRecord(value)) return false;
  if (typeof value.user_name !== "string") return false;
  if (!Array.isArray(value.alerts) || !Array.isArray(value.goals)) return false;
  if (!value.alerts.every(isValidAlert) || !value.goals.every(isValidGoal)) return false;
  if (!isValidAiInsight(value.ai_insight)) return false;
  const kpis = value.kpis;
  if (!isRecord(kpis)) return false;
  return KPI_KEYS.every((key) => isValidKpiValue(kpis[key]));
}

function isValidVitalRow(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value) || typeof value.date !== "string" || !value.date.trim()) return false;
  return (
    hasNullableNumberField(value, "heart_rate") &&
    hasNullableNumberField(value, "systolic") &&
    hasNullableNumberField(value, "diastolic")
  );
}

function errorSliceFromStatus<T>(
  payload: unknown,
  status: number,
  fallbackMessage: string,
): DataSlice<T> {
  const error =
    payload && typeof payload === "object" && "error" in payload
      ? (payload as { error?: { code?: unknown; message?: unknown } }).error
      : null;
  return dataSlice.recoverableError<T>({
    code: typeof error?.code === "string" && error.code ? error.code : `HTTP_${status}`,
    message:
      typeof error?.message === "string" && error.message
        ? error.message
        : fallbackMessage,
  });
}

function parseErrorSlice<T>(message: string): DataSlice<T> {
  return dataSlice.recoverableError<T>({ code: "PARSE_ERROR", message });
}

export async function getDashboardSummary(): Promise<DataSlice<DashboardSummary>> {
  try {
    const reqHeaders = await headers();
    const res = await fetch(bffUrl(reqHeaders, "/api/v1/dashboard/summary"), {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      return errorSliceFromStatus<DashboardSummary>(
        json,
        res.status,
        "Could not load dashboard summary.",
      );
    }

    const json = await res.json().catch(() => null);
    const d = json?.data;
    if (!hasDashboardSummaryShape(d)) {
      return parseErrorSlice<DashboardSummary>("Dashboard summary response was invalid.");
    }

    return dataSlice.success({
      userName:
        typeof d.user_name === "string" && d.user_name.trim()
          ? d.user_name
          : "",
      alerts: d.alerts.map((a) => ({
        id: a.id as string,
        type: a.type as "critical" | "warning" | "info",
        message: a.message as string,
        ...(typeof a.alert_code === "string" ? { alert_code: a.alert_code } : {}),
        ...(isRecord(a.alert_params) ? { alert_params: a.alert_params } : {}),
      })),
      kpis: {
        caloriesBurned: {
          current: numOrNull(d.kpis?.caloriesBurned?.current),
          target: numOrNull(d.kpis?.caloriesBurned?.target),
        },
        sleepScore: {
          current: numOrNull(d.kpis?.sleepScore?.current),
          target: numOrNull(d.kpis?.sleepScore?.target),
        },
        heartRate: {
          current: numOrNull(d.kpis?.heartRate?.current),
          target: numOrNull(d.kpis?.heartRate?.target),
        },
        steps: {
          current: numOrNull(d.kpis?.steps?.current),
          target: numOrNull(d.kpis?.steps?.target),
        },
      },
      goals: d.goals.map(
        (goal): DashboardSummary["goals"][number] => ({
          id: goal.id as string,
          key: goal.key as "water" | "steps" | "calories",
          current: numOrNull(goal.current),
          target: numOrNull(goal.target),
          unit: goal.unit as string,
        }),
      ),
      aiInsight:
        isRecord(d.ai_insight) && typeof d.ai_insight.text === "string" && d.ai_insight.text.trim()
          ? {
              text: d.ai_insight.text,
              category:
                typeof d.ai_insight.category === "string"
                  ? d.ai_insight.category
                  : undefined,
              confidence: numOrNull(d.ai_insight.confidence),
            }
          : null,
    });
  } catch {
    return dataSlice.recoverableError<DashboardSummary>({
      code: "DASHBOARD_SUMMARY_FETCH_FAILED",
      message: "Could not load dashboard summary.",
    });
  }
}

export async function getVitalsTimeseries(days: number = 7): Promise<DataSlice<VitalPoint[]>> {
  try {
    const reqHeaders = await headers();
    const res = await fetch(bffUrl(reqHeaders, `/api/v1/vitals/timeseries?days=${days}`), {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      return errorSliceFromStatus<VitalPoint[]>(
        json,
        res.status,
        "Could not load vitals timeseries.",
      );
    }
    const json = await res.json().catch(() => null);
    const data = json?.data;
    if (!Array.isArray(data)) {
      return parseErrorSlice<VitalPoint[]>("Vitals timeseries response was invalid.");
    }
    if (!data.every(isValidVitalRow)) {
      return parseErrorSlice<VitalPoint[]>("Vitals timeseries response was invalid.");
    }
    const items = data.map(
      (row): VitalPoint => ({
        date: typeof row.date === "string" ? row.date : "",
        heartRate: numOrNull(row.heart_rate) ?? undefined,
        systolic: numOrNull(row.systolic) ?? undefined,
        diastolic: numOrNull(row.diastolic) ?? undefined,
      })
    );
    if (items.length === 0) {
      return { status: "empty", data: [] };
    }
    return dataSlice.success(items);
  } catch {
    return dataSlice.recoverableError<VitalPoint[]>({
      code: "VITALS_TIMESERIES_FETCH_FAILED",
      message: "Could not load vitals timeseries.",
    });
  }
}

/**
 * Returns the upcoming reminders for the current user as a {@link DataSlice}
 * so the dashboard widget can distinguish between "no data yet" (empty),
 * "couldn't reach the API" (recoverable_error), and "loaded successfully".
 *
 * The previous implementation collapsed every failure into an empty list,
 * which silently hid auth/network failures from the user (UX plan §G,
 * P0 truth-and-safety fix).
 */
export async function getUpcomingReminders(): Promise<DataSlice<ReminderItem[]>> {
  try {
    const reqHeaders = await headers();
    const res = await fetch(bffUrl(reqHeaders, "/api/v1/reminders/upcoming"), {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      const code =
        typeof json?.error?.code === "string" ? json.error.code : `HTTP_${res.status}`;
      const message =
        typeof json?.error?.message === "string"
          ? json.error.message
          : "Could not load reminders.";
      return {
        status: "recoverable_error",
        error: { code, message },
      };
    }

    const json = await res.json().catch(() => null);
    const data = json?.data;
    if (!Array.isArray(data)) {
      return { status: "empty", data: [] };
    }

    const items = data
      .map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (row: any): ReminderItem | null => {
          if (
            row?.type !== "medicine" &&
            row?.type !== "appointment" &&
            row?.type !== "exercise"
          ) {
            return null;
          }
          return {
            id: typeof row.id === "string" ? row.id : "",
            type: row.type,
            title:
              typeof row.title === "string" && row.title.trim() ? row.title : "",
            time: typeof row.time === "string" ? row.time : "--",
            done: Boolean(row.done),
          };
        },
      )
      .filter((row): row is ReminderItem => row !== null);

    if (items.length === 0) {
      return { status: "empty", data: [] };
    }
    return { status: "success", data: items };
  } catch (err) {
    return {
      status: "recoverable_error",
      error: {
        code: "REMINDERS_FETCH_FAILED",
        message: err instanceof Error ? err.message : "Could not load reminders.",
      },
    };
  }
}

