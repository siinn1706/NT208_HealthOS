"use client";

import { cn } from "@/lib/utils";
import type { UserBmiData } from "@/data/gamification";
import { useTranslations } from "next-intl";

interface BmiScoreCardProps {
  bmi: UserBmiData;
}

// BMI ranges: underweight <18.5, normal 18.5-24.9, overweight 25-29.9, obese >=30
const BMI_SCALE_MAX = 35;
const BMI_SCALE_MIN = 15;

const BMI_STATUS_CONFIG = {
  underweight: { color: "#60A5FA", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  normal:      { color: "#4ADE80", bg: "bg-green-500/10", border: "border-green-500/30" },
  overweight:  { color: "#FBBF24", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  obese:       { color: "#F87171", bg: "bg-red-500/10", border: "border-red-500/30" },
};

export function BmiScoreCard({ bmi }: BmiScoreCardProps) {
  const t = useTranslations("dashboard.progress");
  const config = BMI_STATUS_CONFIG[bmi.status];
  const hasBmi = bmi.bmi != null;
  const bmiValue = bmi.bmi ?? 0;
  const pct = hasBmi
    ? Math.min(Math.max(((bmiValue - BMI_SCALE_MIN) / (BMI_SCALE_MAX - BMI_SCALE_MIN)) * 100, 0), 100)
    : 0;
  const currentWeight = bmi.weightKg ?? 0;
  const targetWeight = bmi.targetWeightKg ?? 0;
  const weightDiff = currentWeight - targetWeight;

  return (
    <div
      className={cn(
        "rounded-xl border p-5 space-y-4",
        config.border,
        config.bg
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{t("bmiLabel")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("bmiContribution")}
          </p>
        </div>
        <div
          className={cn(
            "px-2.5 py-1 rounded-full text-xs font-semibold border",
            config.border
          )}
          style={{ color: config.color }}
        >
          {t(`bmiLabels.${bmi.status}`)}
        </div>
      </div>

      {/* BMI value + ranking contribution */}
      <div className="flex items-end gap-4">
        <div>
          <p className="text-4xl font-bold text-foreground">
            {hasBmi ? bmiValue.toFixed(1) : "--"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {bmi.heightCm ?? "--"}cm / {bmi.weightKg ?? "--"}kg
          </p>
        </div>
        <div className="pb-1">
          <p className="text-2xl font-bold" style={{ color: config.color }}>
            {bmi.bmiScore != null ? `+${bmi.bmiScore}` : "--"}
          </p>
          <p className="text-[11px] text-muted-foreground">{t("rankingPoints")}</p>
        </div>
      </div>

      {/* Scale bar */}
      <div className="space-y-1.5">
        <div className="relative h-2 w-full rounded-full bg-gradient-to-r from-blue-400 via-green-400 via-yellow-400 to-red-400 overflow-hidden">
          <div
            className="absolute top-0 h-2 w-0.5 bg-white shadow-sm transition-[left] duration-500"
            style={{ left: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>15</span>
          <span>18.5</span>
          <span>25</span>
          <span>30</span>
          <span>35</span>
        </div>
      </div>

      {/* Target */}
      {bmi.status !== "normal" && bmi.targetBmi != null && (
        <div className="rounded-lg bg-background/40 border border-border px-3 py-2">
          <p className="text-xs text-muted-foreground">
            {t("targetLabel")}{" "}
            <span className="text-foreground font-medium">
              BMI {bmi.targetBmi.toFixed(1)} — {targetWeight.toFixed(1)}kg
            </span>
            {weightDiff > 0 && (
              <span className="text-yellow-400">
                {" "}
                ({t("needToLose")} {weightDiff.toFixed(1)}kg)
              </span>
            )}
            {weightDiff < 0 && (
              <span className="text-blue-400">
                {" "}
                ({t("needToGain")} {Math.abs(weightDiff).toFixed(1)}kg)
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
