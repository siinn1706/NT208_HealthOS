import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { TrendingUp, Scale, Ruler, Award } from "lucide-react";
import { BmiProgressChart } from "@/components/charts/BmiProgressChart";
import { getUserBmiData } from "@/lib/gamification-data";
import { getAggregatedMetrics } from "@/lib/analytics-data";
import type { AggregationPoint } from "@/types/api";

function Skeleton() {
  return <div className="animate-pulse rounded-xl bg-muted h-64" />;
}

interface BmiProgressPageProps {
  searchParams: Promise<{ period?: string }>;
}

async function BmiProgressContent({ period = "30d" }: { period: string }) {
  const [bmiData, weightHistory] = await Promise.all([
    getUserBmiData(),
    getAggregatedMetrics("weight_kg", "daily"),
  ]);

  // Build BMI history from weight data
  const heightM = bmiData.heightCm / 100;
  const bmiHistory = weightHistory.map((w: AggregationPoint) => ({
    date: w.date,
    bmi: parseFloat((w.avg_value / (heightM * heightM)).toFixed(1)),
  }));

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Tiến độ BMI</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Theo dõi chỉ số BMI và cân nặng của bạn
        </p>
      </div>

      {/* Current BMI stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{bmiData.bmi.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">BMI hiện tại</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Award className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{bmiData.targetBmi.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">BMI mục tiêu</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Scale className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{bmiData.weightKg.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Cân nặng (kg)</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Ruler className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{bmiData.heightCm}</p>
            <p className="text-xs text-muted-foreground">Chiều cao (cm)</p>
          </div>
        </div>
      </div>

      {/* BMI progress chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">Biểu đồ BMI</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Lịch sử BMI theo thời gian
          </p>
        </div>
        {bmiHistory.length > 0 ? (
          <BmiProgressChart bmiData={bmiData} historyData={bmiHistory} height={280} />
        ) : (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            Chưa có dữ liệu BMI
          </div>
        )}
      </div>

      {/* BMI status info */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Thông tin BMI</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Phân loại</p>
            <p className="font-medium text-foreground capitalize">{bmiData.status}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Cân nặng mục tiêu</p>
            <p className="font-medium text-foreground">{bmiData.targetWeightKg.toFixed(1)} kg</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Điểm BMI</p>
            <p className="font-medium text-foreground">{bmiData.bmiScore} / 100</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function ProgressPage({ searchParams }: BmiProgressPageProps) {
  const params = await searchParams;
  const period = params.period ?? "30d";

  return (
    <Suspense fallback={<Skeleton />}>
      <BmiProgressContent period={period} />
    </Suspense>
  );
}
