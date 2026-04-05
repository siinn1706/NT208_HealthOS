"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { saveHealthGoalAction, type SavedGoal } from "./save-health-goal-action";

interface HealthGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialGoal: UserBmiData | null;
  /** Called with the saved goal on success so parent can update state directly */
  onSaved?: (goal: SavedGoal) => void;
}

interface HealthGoalFormData {
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

export function HealthGoalDialog({
  open,
  onOpenChange,
  initialGoal,
  onSaved,
}: HealthGoalDialogProps) {
  const t = useTranslations("progress");
  const tg = useTranslations("goalDialog");
  const [saving, setSaving] = useState(false);

  const form = useForm<HealthGoalFormData>({
    defaultValues: {
      targetWeightKg: initialGoal?.targetWeightKg?.toString() ?? "",
      deadline: initialGoal?.deadline ?? "",
    },
  });

  // Reset form when dialog opens with new initialGoal
  useEffect(() => {
    if (open) {
      form.reset({
        targetWeightKg: initialGoal?.targetWeightKg?.toString() ?? "",
        deadline: initialGoal?.deadline ?? "",
      });
    }
  }, [open, initialGoal]);

  const profileHeight = initialGoal?.heightCm ?? 0;
  const targetWeight = Number(form.watch("targetWeightKg"));

  // BMI = weight / height² — use profile height (single source of truth)
  const computedBmi =
    profileHeight > 0 && targetWeight > 0
      ? parseFloat((targetWeight / (profileHeight / 100) ** 2).toFixed(1))
      : null;

  // Recommend target weight based on profile height (BMI=22)
  const weightFilled = targetWeight > 0;
  const recWeight = !weightFilled && profileHeight > 0 ? recommendWeight(profileHeight) : null;

  function getBmiCategoryLabel(bmi: number | null): string {
    if (bmi == null) return "—";
    if (bmi < 18.5) return t("bmiCategory.underweight");
    if (bmi < 25) return t("bmiCategory.normal");
    if (bmi < 30) return t("bmiCategory.overweight");
    return t("bmiCategory.obese");
  }

  async function handleSave() {
    setSaving(true);
    try {
      const formData = form.getValues();
      const result = await saveHealthGoalAction(initialGoal?.goalId ?? null, {
        target_weight_kg: formData.targetWeightKg ? Number(formData.targetWeightKg) : null,
        deadline: formData.deadline || null,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(initialGoal?.goalId ? tg("saveSuccess") : tg("saveNewSuccess"));
      onOpenChange(false);
      // Pass saved goal back to parent — parent applies it to local state directly
      onSaved?.(result.goal);
    } catch {
      toast.error(tg("saveFailed"));
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
            {recWeight != null && (
              <p className="text-xs text-muted-foreground">
                {t("recWeight", { weight: recWeight })}
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
                {getBmiCategoryLabel(computedBmi)}
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
