/**
 * Dashboard server-side data helpers.
 * These functions are called ONLY in Server Components (no "use client").
 * They call the BFF /api/v1/* endpoints first, then fall back to mock data on error.
 */
import { headers } from "next/headers";

export interface DashboardSummary {
  userName: string;
  alerts: Array<{ id: string; type: "critical" | "warning" | "info"; message: string }>;
  kpis: {
    caloriesBurned: { current: number; target: number };
    sleepScore: { current: number; target: number };
    heartRate: { current: number; target: number };
    steps: { current: number; target: number };
  };
  goals: Array<{
    id: string;
    key: "water" | "steps" | "calories";
    current: number;
    target: number;
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

// ---------------------------------------------------------------------------
// Mock data for fallback
// ---------------------------------------------------------------------------

const MOCK_DASHBOARD_SUMMARY: DashboardSummary = {
  userName: "Nguyễn Văn A",
  alerts: [],
  kpis: {
    caloriesBurned: { current: 1850, target: 2000 },
    sleepScore: { current: 78, target: 100 },
    heartRate: { current: 72, target: 100 },
    steps: { current: 8420, target: 10000 },
  },
  goals: [
    { id: "1", key: "water", current: 1500, target: 2000, unit: "ml" },
    { id: "2", key: "steps", current: 8420, target: 10000, unit: "bước" },
    { id: "3", key: "calories", current: 1850, target: 2000, unit: "kcal" },
  ],
  aiInsight: {
    text: "Hôm nay bạn đã đạt 92% mục tiêu nước uống. Hãy tiếp tục duy trì nhé!",
    category: "nutrition",
  },
};

const MOCK_VITALS_TIMESERIES: VitalPoint[] = [
  { date: "2026-03-06", heartRate: 68, systolic: 118, diastolic: 75 },
  { date: "2026-03-07", heartRate: 72, systolic: 120, diastolic: 78 },
  { date: "2026-03-08", heartRate: 70, systolic: 116, diastolic: 74 },
  { date: "2026-03-09", heartRate: 75, systolic: 122, diastolic: 80 },
  { date: "2026-03-10", heartRate: 71, systolic: 119, diastolic: 76 },
  { date: "2026-03-11", heartRate: 69, systolic: 117, diastolic: 75 },
  { date: "2026-03-12", heartRate: 72, systolic: 120, diastolic: 78 },
];

const MOCK_UPCOMING_REMINDERS: ReminderItem[] = [
  { id: "1", type: "medicine", title: "Uống thuốc bổ vitamin D", time: "08:00", done: true },
  { id: "2", type: "exercise", title: "Tập thể dục buổi sáng", time: "06:30", done: false },
  { id: "3", type: "appointment", title: "Khám sức khỏe định kỳ", time: "14:00", done: false },
];

// ---------------------------------------------------------------------------
// Data access helpers
// ---------------------------------------------------------------------------

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const reqHeaders = await headers();
    const res = await fetch(`${appUrl}/api/v1/dashboard/summary`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });
    if (!res.ok) {
      console.warn("[dashboard-data] Failed to fetch dashboard summary, using mock data");
      return MOCK_DASHBOARD_SUMMARY;
    }
    const json = await res.json();
    const d = json?.data;
    if (!d) {
      console.warn("[dashboard-data] Invalid response, using mock data");
      return MOCK_DASHBOARD_SUMMARY;
    }
    return {
      userName: d.user_name ?? "User",
      alerts: d.alerts ?? [],
      kpis: d.kpis ?? MOCK_DASHBOARD_SUMMARY.kpis,
      goals: d.goals ?? MOCK_DASHBOARD_SUMMARY.goals,
      aiInsight: d.ai_insight ? { text: d.ai_insight.text, category: d.ai_insight.category } : null,
    };
  } catch (error) {
    console.warn("[dashboard-data] Error fetching dashboard summary:", error);
    return MOCK_DASHBOARD_SUMMARY;
  }
}

export async function getVitalsTimeseries(): Promise<VitalPoint[]> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const reqHeaders = await headers();
    const res = await fetch(`${appUrl}/api/v1/vitals/timeseries`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });
    if (!res.ok) {
      console.warn("[dashboard-data] Failed to fetch vitals timeseries, using mock data");
      return MOCK_VITALS_TIMESERIES;
    }
    const json = await res.json();
    const data = json?.data;
    if (!data || !Array.isArray(data)) {
      console.warn("[dashboard-data] Invalid vitals response, using mock data");
      return MOCK_VITALS_TIMESERIES;
    }
    return data;
  } catch (error) {
    console.warn("[dashboard-data] Error fetching vitals timeseries:", error);
    return MOCK_VITALS_TIMESERIES;
  }
}

export async function getUpcomingReminders(): Promise<ReminderItem[]> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const reqHeaders = await headers();
    const res = await fetch(`${appUrl}/api/v1/reminders/upcoming`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });
    if (!res.ok) {
      console.warn("[dashboard-data] Failed to fetch upcoming reminders, using mock data");
      return MOCK_UPCOMING_REMINDERS;
    }
    const json = await res.json();
    const data = json?.data;
    if (!data || !Array.isArray(data)) {
      console.warn("[dashboard-data] Invalid reminders response, using mock data");
      return MOCK_UPCOMING_REMINDERS;
    }
    return data;
  } catch (error) {
    console.warn("[dashboard-data] Error fetching upcoming reminders:", error);
    return MOCK_UPCOMING_REMINDERS;
  }
}
