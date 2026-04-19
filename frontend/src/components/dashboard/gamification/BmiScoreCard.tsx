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
  underweight: { color: "var(--info)",        bg: "bg-info/10",        border: "border-info/30" },
  normal:      { color: "var(--success)",     bg: "bg-success/10",     border: "border-success/30" },
  overweight:  { color: "var(--warning)",     bg: "bg-warning/10",     border: "border-warning/30" },
  obese:       { color: "var(--destructive)", bg: "bg-destructive/10", border: "border-destructive/30" },
};

export function BmiScoreCard({ bmi }: BmiScoreCardProps) {
  const t = useTranslations("dashboard.progress");
  const config = BMI_STATUS_CONFIG[bmi.status];
  const hasBmi = bmi.bmi != null;
  const bmiValue = bmi.bmi ?? 0;
  const pct = hasBmi
    ? Math.min(Math.max(((bmiValue - BMI_SCALE_MIN) / (BMI_SCALE_MAX - BMI_SCALE_MIN)) * 100, 0), 100)
    : 0;
  const hasTarget = bmi.targetWeightKg != null && bmi.weightKg != null;
  const currentWeight = bmi.weightKg ?? 0;
  const targetWeight = bmi.targetWeightKg ?? 0;
  const weightDiff = hasTarget ? currentWeight - targetWeight : 0;

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

      {/* Scale bar — gradient is decorative; the indicator only renders when
          we actually have a BMI reading so we never imply a measurement. */}
      <div className="space-y-1.5" aria-hidden={!hasBmi}>
        <div
          className="relative h-2 w-full rounded-full overflow-hidden"
          style={{
            background:
              "linear-gradient(to right, var(--info), var(--success), var(--warning), var(--destructive))",
          }}
        >
          {hasBmi && (
            <div
              className="absolute top-0 h-2 w-0.5 bg-foreground shadow-sm transition-[left] duration-500"
              style={{ left: `${pct}%` }}
            />
          )}
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>15</span>
          <span>18.5</span>
          <span>25</span>
          <span>30</span>
          <span>35</span>
        </div>
      </div>

      {/* Target — only render when both target & current weight are known so
          the delta is an honest comparison, not 0 - target. */}
      {bmi.status !== "normal" && bmi.targetBmi != null && hasTarget && (
        <div className="rounded-lg bg-background/40 border border-border px-3 py-2">
          <p className="text-xs text-muted-foreground">
            {t("targetLabel")}{" "}
            <span className="text-foreground font-medium">
              BMI {bmi.targetBmi.toFixed(1)} — {targetWeight.toFixed(1)}kg
            </span>
            {weightDiff > 0 && (
              <span className="text-warning">
                {" "}
                ({t("needToLose")} {weightDiff.toFixed(1)}kg)
              </span>
            )}
            {weightDiff < 0 && (
              <span className="text-info">
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
