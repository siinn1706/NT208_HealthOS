"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { bffFetchClient } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { UserBmiData } from "@/data/gamification";

interface HealthGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialGoal: UserBmiData | null;
  onSaved: () => void;
}

interface HealthGoalFormData {
  targetHeightCm: string;
  targetWeightKg: string;
  deadline: string;
}

// Ideal BMI midpoint of the "normal" range (18.5–24.9)
const IDEAL_BMI = 22;

function recommendWeight(heightCm: number): number | null {
  if (heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return parseFloat((IDEAL_BMI * heightM * heightM).toFixed(1));
}

function recommendHeight(weightKg: number): number | null {
  if (weightKg <= 0) return null;
  return parseFloat((Math.sqrt(weightKg / IDEAL_BMI) * 100).toFixed(1));
}

export function HealthGoalDialog({
  open,
  onOpenChange,
  initialGoal,
  onSaved,
}: HealthGoalDialogProps) {
  const t = useTranslations("progress");
  const [saving, setSaving] = useState(false);

  const form = useForm<HealthGoalFormData>({
    defaultValues: {
      targetHeightCm: initialGoal?.heightCm?.toString() ?? "170",
      targetWeightKg: initialGoal?.targetWeightKg?.toString() ?? "",
      deadline: initialGoal?.deadline ?? "",
    },
  });

  // Reset form when dialog opens with new initialGoal
  useEffect(() => {
    if (open) {
      form.reset({
        targetHeightCm: initialGoal?.heightCm?.toString() ?? "170",
        targetWeightKg: initialGoal?.targetWeightKg?.toString() ?? "",
        deadline: initialGoal?.deadline ?? "",
      });
    }
  }, [open, initialGoal]);

  const targetHeight = Number(form.watch("targetHeightCm"));
  const targetWeight = Number(form.watch("targetWeightKg"));

  // BMI = weight / height²
  const computedBmi =
    targetHeight > 0 && targetWeight > 0
      ? parseFloat((targetWeight / (targetHeight / 100) ** 2).toFixed(1))
      : null;

  // Recommendations based on BMI=22 (midpoint of "normal" range)
  // Show ONLY ONE recommendation: the field the user has NOT filled yet.
  const heightFilled = targetHeight > 0;
  const weightFilled = targetWeight > 0;
  const recWeight = !weightFilled ? recommendWeight(targetHeight) : null;
  const recHeight = !heightFilled ? recommendHeight(targetWeight) : null;

  async function handleSave() {
    setSaving(true);
    try {
      const formData = form.getValues();
      const payload = {
        target_weight_kg: formData.targetWeightKg ? Number(formData.targetWeightKg) : null,
        current_height_cm: formData.targetHeightCm ? Number(formData.targetHeightCm) : null,
        deadline: formData.deadline || null,
      };

      const endpoint = initialGoal?.goalId
        ? `/api/v1/health-goals/${initialGoal.goalId}`
        : "/api/v1/health-goals";
      const method = initialGoal?.goalId ? "PATCH" : "POST";

      const { error } = await bffFetchClient(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      if (error) {
        toast.error("Không thể lưu mục tiêu sức khỏe");
        return;
      }

      toast.success(initialGoal?.goalId ? "Đã cập nhật mục tiêu" : "Đã lưu mục tiêu");
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Không thể lưu mục tiêu sức khỏe");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {initialGoal?.goalId ? t("editGoal") : t("setGoal")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {initialGoal?.goalId ? t("editGoal") : t("setGoal")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-4"
        >
          {/* Target Height */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-height">{t("targetHeight")} (cm)</Label>
            <Input
              id="goal-height"
              type="number"
              min={100}
              max={220}
              step={0.1}
              {...form.register("targetHeightCm")}
              className="h-9"
            />
            {recWeight != null && (
              <p className="text-xs text-muted-foreground">
                {t("recWeight", { weight: recWeight })}
              </p>
            )}
          </div>

          {/* Target Weight */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-weight">{t("targetWeight")} (kg)</Label>
            <Input
              id="goal-weight"
              type="number"
              min={30}
              max={200}
              step={0.1}
              placeholder="65.0"
              {...form.register("targetWeightKg")}
              className="h-9"
            />
            {recHeight != null && (
              <p className="text-xs text-muted-foreground">
                {t("recHeight", { height: recHeight })}
              </p>
            )}
          </div>

          {/* BMI — auto-calculated, read-only */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-bmi">{t("bmi")}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="goal-bmi"
                type="number"
                step={0.1}
                value={computedBmi ?? ""}
                readOnly
                disabled
                className="h-9 bg-muted cursor-not-allowed"
              />
              <span className="text-sm text-muted-foreground shrink-0">
                {computedBmi != null ? (
                  computedBmi < 18.5
                    ? "Gầy"
                    : computedBmi < 25
                    ? "Bình thường"
                    : computedBmi < 30
                    ? "Thừa cân"
                    : "Béo phì"
                ) : (
                  "—"
                )}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("bmiAutoHint")}
            </p>
          </div>

          {/* Deadline */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-deadline">{t("deadline")}</Label>
            <Input
              id="goal-deadline"
              type="date"
              {...form.register("deadline")}
              className="h-9"
            />
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="cursor-pointer"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="cursor-pointer"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
