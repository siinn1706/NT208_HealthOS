"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ACTIVITY_CONFIG,
  type ActivityType,
} from "@/data/gamification";
import { CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";

type WizardStep = 1 | 2 | 3;

interface GoalCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoalCreated?: (activityType: ActivityType, targetValue: number, unit: string) => void;
}

export function GoalCreationWizard({
  open,
  onOpenChange,
  onGoalCreated,
}: GoalCreationWizardProps) {
  const t = useTranslations("dashboard.goals");
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<{
    value: number;
    unit: string;
  } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  function reset() {
    setStep(1);
    setSelectedActivity(null);
    setSelectedMilestone(null);
    setConfirmed(false);
  }

  function handleClose() {
    onOpenChange(false);
    setTimeout(reset, 300);
  }

  function handleActivitySelect(type: ActivityType) {
    setSelectedActivity(type);
    setSelectedMilestone(null);
    setStep(2);
  }

  function handleMilestoneSelect(m: { value: number; unit: string }) {
    setSelectedMilestone(m);
    setStep(3);
  }

  function handleConfirm() {
    if (!selectedActivity || !selectedMilestone) return;
    setConfirmed(true);
    onGoalCreated?.(selectedActivity, selectedMilestone.value, selectedMilestone.unit);
    setTimeout(handleClose, 1500);
  }

  const activityEntries = Object.entries(ACTIVITY_CONFIG) as [
    ActivityType,
    (typeof ACTIVITY_CONFIG)[ActivityType]
  ][];

  const stepLabels: Record<WizardStep, string> = {
    1: t("step1"),
    2: t("step2"),
    3: t("step3"),
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("newGoal")}</DialogTitle>
          <DialogDescription>
            {t("hint")}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-2">
          {([1, 2, 3] as WizardStep[]).map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-200 flex-shrink-0",
                  step > s
                    ? "bg-[#1965B3] border-[#1965B3] text-white"
                    : step === s
                    ? "bg-[#1965B3]/20 border-[#1965B3] text-[#41BCE6]"
                    : "bg-muted border-border text-muted-foreground"
                )}
              >
                {step > s ? "✓" : s}
              </div>
              <span
                className={cn(
                  "text-xs font-medium flex-1 truncate",
                  step >= s ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {stepLabels[s]}
              </span>
              {s < 3 && (
                <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        <div className="min-h-[260px]">
          {/* Step 1: Select activity */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {activityEntries.map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => handleActivitySelect(type)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                    "hover:border-[#1965B3] hover:bg-[#1965B3]/10 active:scale-95",
                    "border-border bg-muted/30 cursor-pointer"
                  )}
                >
                  <span className="text-3xl">{config.emoji}</span>
                  <span className="text-xs font-medium text-foreground">
                    {t(`dashboard.goals.activityLabels.${type}` as Parameters<typeof t>[0])}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Select milestone */}
          {step === 2 && selectedActivity && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">
                  {ACTIVITY_CONFIG[selectedActivity].emoji}
                </span>
                <p className="text-sm font-semibold text-foreground">
                  {t(`dashboard.goals.activityLabels.${selectedActivity}` as Parameters<typeof t>[0])}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ACTIVITY_CONFIG[selectedActivity].milestones.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => handleMilestoneSelect(m)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all duration-200",
                      "hover:border-[#1965B3] hover:bg-[#1965B3]/10 active:scale-95",
                      selectedMilestone?.value === m.value
                        ? "border-[#1965B3] bg-[#1965B3]/10"
                        : "border-border bg-muted/30",
                      "cursor-pointer"
                    )}
                  >
                    <span className="text-lg font-bold text-foreground">
                      {m.value.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {t("dailyUnit", { u: m.unit })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && selectedActivity && selectedMilestone && (
            <div className="space-y-4">
              {confirmed ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <CheckCircle2 className="w-14 h-14 text-green-400" />
                  <p className="text-sm font-semibold text-foreground">
                    {t("setSuccess")}
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-[#1965B3]/40 bg-[#1965B3]/10 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {ACTIVITY_CONFIG[selectedActivity].emoji}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {t(`dashboard.goals.activityLabels.${selectedActivity}` as Parameters<typeof t>[0])}{" "}
                          {selectedMilestone.value.toLocaleString()}{" "}
                          {selectedMilestone.unit}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("everyday")}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-background/50 border border-border/50 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
                      <p>
                        📅{" "}
                        <span className="text-foreground font-medium">
                          {t("maintainReq")}
                        </span>{" "}
                        ≥ 5 {t("perWeek")}
                      </p>
                      <p>
                        🏆{" "}
                        <span className="text-foreground font-medium">
                          {t("reward")}
                        </span>{" "}
                        {t("badgePoints")}
                      </p>
                      <p>
                        🔥{" "}
                        <span className="text-foreground font-medium">
                          {t("streak")}
                        </span>{" "}
                        {t("streakAccumulate")}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {!confirmed && (
          <div className="flex items-center justify-between pt-2">
            {step > 1 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep((s) => (s - 1) as WizardStep)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {t("back")}
              </Button>
            ) : (
              <div />
            )}
            {step === 3 && (
              <Button
                size="sm"
                className="bg-[#1965B3] hover:bg-[#1965B3]/90"
                onClick={handleConfirm}
              >
                {t("startNow")}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
