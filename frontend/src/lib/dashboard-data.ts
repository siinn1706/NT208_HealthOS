/**
 * Dashboard server-side data helpers.
 * These functions are called ONLY in Server Components (no "use client").
 * They access mock data directly for MVP; in V1 they proxy to Core BE.
 */

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
// Mock data — replace with fetch() calls to Core BE in V1
// ---------------------------------------------------------------------------

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return {
    userName: "Nguyễn Văn A",
    alerts: [
      {
        id: "alert-1",
        type: "warning",
        message: "Nhịp tim của bạn cao hơn mức bình thường trong 10 phút vừa qua.",
      },
      {
        id: "alert-2",
        type: "info",
        message: "Bạn chưa ghi nhật ký bữa trưa hôm nay.",
      },
    ],
    kpis: {
      caloriesBurned: { current: 1240, target: 2000 },
      sleepScore: { current: 78, target: 100 },
      heartRate: { current: 74, target: 100 },
      steps: { current: 6800, target: 10000 },
    },
    goals: [
      { id: "g-1", key: "water", current: 1500, target: 2000, unit: "ml" },
      { id: "g-2", key: "steps", current: 6800, target: 10000, unit: "bước" },
      { id: "g-3", key: "calories", current: 1240, target: 2000, unit: "kcal" },
    ],
    aiInsight: {
      text: "Dựa trên nhịp tim và số bước hôm nay, bạn nên đi bộ thêm khoảng 20 phút để đạt mục tiêu. Uống thêm 500ml nước để cải thiện hiệu suất vận động.",
      category: "activity",
    },
  };
}

export async function getVitalsTimeseries(): Promise<VitalPoint[]> {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    // Deterministic values based on index (no Math.random for SSR stability)
    const offsets = [2, -1, 3, 0, 4, -2, 1];
    const bpOffsets = [0, 2, -1, 3, 0, 2, -2];
    return {
      date: `${mm}-${dd}`,
      heartRate: 72 + offsets[i],
      systolic: 118 + bpOffsets[i],
      diastolic: 76 + offsets[i] * 0.5,
    };
  });
}

export async function getUpcomingReminders(): Promise<ReminderItem[]> {
  return [
    { id: "r-1", type: "medicine", title: "Metformin 500mg", time: "08:00", done: false },
    { id: "r-2", type: "appointment", title: "Khám định kỳ - BS. Minh", time: "10:30", done: false },
    { id: "r-3", type: "exercise", title: "Bài tập cardio 30 phút", time: "17:00", done: false },
    { id: "r-4", type: "medicine", title: "Vitamin D3 1000IU", time: "20:00", done: false },
  ];
}
