"use client";

import { useState } from "react";
import { TrendingUp, Scale, Ruler, Award } from "lucide-react";
import { BmiProgressChart } from "@/components/charts/BmiProgressChart";
import type { UserBmiData } from "@/data/gamification";
import { HealthGoalDialog } from "./HealthGoalDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import type { AggregationPoint } from "@/types/api";

interface ProgressPageClientProps {
  bmiData: UserBmiData;
  weightHistory: AggregationPoint[];
}

function getDaysRemaining(deadline: string | null): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function ProgressPageClient({ bmiData, weightHistory }: ProgressPageClientProps) {
  const t = useTranslations("dashboard.progress");
  const [dialogOpen, setDialogOpen] = useState(false);

  const heightM = bmiData.heightCm / 100;
  const bmiHistory = weightHistory.map((w: AggregationPoint) => ({
    date: w.date,
    bmi: parseFloat((w.avg_value / (heightM * heightM)).toFixed(1)),
  }));

  const daysRemaining = getDaysRemaining(bmiData.deadline);
  const isOverdue = daysRemaining !== null && daysRemaining < 0;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tiến độ BMI</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Theo dõi chỉ số BMI và cân nặng của bạn
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="cursor-pointer shrink-0"
        >
          {bmiData.goalId ? t("editGoal") : t("setGoal")}
        </Button>
      </div>

      {/* Current BMI stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{bmiData.bmi.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">{t("currentBmi")}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Award className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-2xl font-bold text-foreground">{bmiData.targetBmi.toFixed(1)}</p>
              {daysRemaining !== null && (
                <Badge variant={isOverdue ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0.5 shrink-0">
                  {isOverdue
                    ? t("overdue")
                    : t("daysRemaining").replace("X", String(daysRemaining))}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t("targetBmi")}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Scale className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{bmiData.weightKg.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">{t("currentWeight")} (kg)</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Ruler className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{bmiData.heightCm}</p>
            <p className="text-xs text-muted-foreground">{t("height")} (cm)</p>
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
            <p className="text-muted-foreground">{t("targetWeight")}</p>
            <p className="font-medium text-foreground">{bmiData.targetWeightKg.toFixed(1)} kg</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">{t("bmiScore")}</p>
            <p className="font-medium text-foreground">{bmiData.bmiScore} / 100</p>
          </div>
        </div>
      </div>

      {/* Health Goal Dialog */}
      <HealthGoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialGoal={bmiData}
        onSaved={() => {
          // Force re-fetch by reloading the page
          window.location.reload();
        }}
      />
    </div>
  );
}
