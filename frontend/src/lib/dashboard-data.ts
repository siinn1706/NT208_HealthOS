import { headers } from "next/headers";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export interface DashboardSummary {
  userName: string;
  alerts: Array<{ id: string; type: "critical" | "warning" | "info"; message: string }>;
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

export interface ReminderItem {
  id: string;
  type: "medicine" | "appointment" | "exercise";
  title: string;
  time: string;
  done?: boolean;
}

function emptySummary(): DashboardSummary {
  return {
    userName: "Chưa có thông tin",
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
    const reqHeaders = await headers();
    const res = await fetch(`${APP_URL}/api/v1/dashboard/summary`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });
    if (!res.ok) return emptySummary();

    const json = await res.json().catch(() => null);
    const d = json?.data;
    if (!d || typeof d !== "object") return emptySummary();

    return {
      userName:
        typeof d.user_name === "string" && d.user_name.trim()
          ? d.user_name
          : "Chưa có thông tin",
      alerts: Array.isArray(d.alerts) ? d.alerts : [],
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

export async function getVitalsTimeseries(): Promise<VitalPoint[]> {
  try {
    const reqHeaders = await headers();
    const res = await fetch(`${APP_URL}/api/v1/vitals/timeseries`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
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

export async function getUpcomingReminders(): Promise<ReminderItem[]> {
  try {
    const reqHeaders = await headers();
    const res = await fetch(`${APP_URL}/api/v1/reminders/upcoming`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    const data = json?.data;
    if (!Array.isArray(data)) return [];
    return data
      .map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (row: any): ReminderItem | null => {
          if (row?.type !== "medicine" && row?.type !== "appointment" && row?.type !== "exercise") {
            return null;
          }
          return {
            id: typeof row.id === "string" ? row.id : "",
            type: row.type,
            title:
              typeof row.title === "string" && row.title.trim()
                ? row.title
                : "Chưa có thông tin",
            time: typeof row.time === "string" ? row.time : "--",
            done: Boolean(row.done),
          };
        }
      )
      .filter((row): row is ReminderItem => row !== null);
  } catch {
    return [];
  }
}

