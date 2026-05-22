import { cookies } from "next/headers";

import type { DataSlice } from "@/types/data-slice";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";
import { CORE_API_URL } from "@/lib/env";

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
  aiInsight: { text: string; category?: string } | null;
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

async function getToken(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(SESSION_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

function emptySummary(): DashboardSummary {
  return {
    userName: "",
    alerts: [],
    kpis: {
      caloriesBurned: { current: null, target: null },
      sleepScore: { current: null, target: null },
      heartRate: { current: null, target: null },
      steps: { current: null, target: null },
    },
    goals: [],
    aiInsight: null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function numOrNull(value: any): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    const token = await getToken();
    if (!token) return emptySummary();
    const res = await fetch(`${CORE_API_URL}/v1/dashboard/summary`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return emptySummary();

    const json = await res.json().catch(() => null);
    const d = json?.data;
    if (!d || typeof d !== "object") return emptySummary();

    return {
      userName:
        typeof d.user_name === "string" && d.user_name.trim()
          ? d.user_name
          : "",
      alerts: Array.isArray(d.alerts)
        ? d.alerts.map((a: Record<string, unknown>) => ({
            id: typeof a?.id === "string" ? a.id : "",
            type:
              a?.type === "critical" || a?.type === "warning" || a?.type === "info"
                ? a.type as "critical" | "warning" | "info"
                : "info",
            message: typeof a?.message === "string" ? a.message : "",
            ...(typeof a?.alert_code === "string" ? { alert_code: a.alert_code } : {}),
            ...(a?.alert_params && typeof a.alert_params === "object" ? { alert_params: a.alert_params as Record<string, unknown> } : {}),
          }))
        : [],
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
      goals: Array.isArray(d.goals)
        ? d.goals.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (goal: any): DashboardSummary["goals"][number] => ({
              id: typeof goal.id === "string" ? goal.id : "",
              key:
                goal.key === "water" || goal.key === "steps" || goal.key === "calories"
                  ? goal.key
                  : "water",
              current: numOrNull(goal.current),
              target: numOrNull(goal.target),
              unit: typeof goal.unit === "string" ? goal.unit : "--",
            })
          )
        : [],
      aiInsight:
        typeof d.ai_insight?.text === "string" && d.ai_insight.text.trim()
          ? {
              text: d.ai_insight.text,
              category:
                typeof d.ai_insight.category === "string"
                  ? d.ai_insight.category
                  : undefined,
            }
          : null,
    };
  } catch {
    return emptySummary();
  }
}

export async function getVitalsTimeseries(days: number = 7): Promise<VitalPoint[]> {
  try {
    const token = await getToken();
    if (!token) return [];
    const res = await fetch(`${CORE_API_URL}/v1/vitals/timeseries?days=${days}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    const data = json?.data;
    if (!Array.isArray(data)) return [];
    return data.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (row: any): VitalPoint => ({
        date: typeof row.date === "string" ? row.date : "",
        heartRate: numOrNull(row.heart_rate) ?? undefined,
        systolic: numOrNull(row.systolic) ?? undefined,
        diastolic: numOrNull(row.diastolic) ?? undefined,
      })
    );
  } catch {
    return [];
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
    const token = await getToken();
    if (!token) {
      return { status: "recoverable_error", error: { code: "AUTH_REQUIRED", message: "Authentication required." } };
    }
    const res = await fetch(`${CORE_API_URL}/v1/reminders/upcoming`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
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

export async function getExerciseSuggestions(): Promise<ExerciseSuggestion[]> {
  try {
    const token = await getToken();
    if (!token) return [];
    const res = await fetch(`${CORE_API_URL}/v1/dashboard/exercise-suggestions`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    const data = json?.data;
    if (!Array.isArray(data)) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((item: any) => ({
      id: typeof item.id === "string" ? item.id : "",
      type: ["tip", "warning", "goal", "success"].includes(item.type) ? item.type : "tip",
      icon: typeof item.icon === "string" ? item.icon : "Info",
      title: typeof item.title === "string" ? item.title : "",
      message: typeof item.message === "string" ? item.message : "",
      message_params: item.message_params ?? undefined,
      priority: typeof item.priority === "number" ? item.priority : 99,
      duration_minutes: typeof item.duration_minutes === "number" ? item.duration_minutes : null,
      intensity: ["low", "medium", "high"].includes(item.intensity) ? item.intensity : "low",
      category: ["cardio", "strength", "flexibility", "balance"].includes(item.category) ? item.category : "cardio",
    }));
  } catch {
    return [];
  }
}

