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
  currentHeightCm: number;
  currentWeightKg: number;
  targetWeightKg: string;
  targetBmi: string;
  deadline: string;
}

export function HealthGoalDialog({
  open,
  onOpenChange,
  initialGoal,
  onSaved,
}: HealthGoalDialogProps) {
  const t = useTranslations("dashboard.progress");
  const [saving, setSaving] = useState(false);

  const form = useForm<HealthGoalFormData>({
    defaultValues: {
      currentHeightCm: initialGoal?.heightCm ?? 170,
      currentWeightKg: initialGoal?.weightKg ?? 70,
      targetWeightKg: initialGoal?.targetWeightKg?.toString() ?? "",
      targetBmi: initialGoal?.targetBmi?.toString() ?? "",
      deadline: initialGoal?.deadline ?? "",
    },
  });

  // Reset form when initialGoal changes (dialog opens with new data)
  useEffect(() => {
    if (open) {
      form.reset({
        currentHeightCm: initialGoal?.heightCm ?? 170,
        currentWeightKg: initialGoal?.weightKg ?? 70,
        targetWeightKg: initialGoal?.targetWeightKg?.toString() ?? "",
        targetBmi: initialGoal?.targetBmi?.toString() ?? "",
        deadline: initialGoal?.deadline ?? "",
      });
    }
  }, [open, initialGoal]);

  const height = form.watch("currentHeightCm") ?? 170;
  const targetWeight = form.watch("targetWeightKg");
  const targetBmiWatch = form.watch("targetBmi");

  // Auto-derive target BMI when target weight changes
  useEffect(() => {
    const h = Number(height);
    const w = Number(targetWeight);
    if (h > 0 && w > 0 && targetWeight && !targetBmiWatch) {
      const bmi = parseFloat((w / (h / 100) ** 2).toFixed(1));
      form.setValue("targetBmi", bmi as unknown as string, { shouldValidate: false });
    }
  }, [targetWeight, height, targetBmiWatch, form]);

  // Auto-derive target weight when BMI changes
  useEffect(() => {
    const h = Number(height);
    const b = Number(targetBmiWatch);
    if (h > 0 && b > 0 && targetBmiWatch && !targetWeight) {
      const w = parseFloat((b * (h / 100) ** 2).toFixed(1));
      form.setValue("targetWeightKg", w as unknown as string, { shouldValidate: false });
    }
  }, [targetBmiWatch, height, targetWeight, form]);

  async function handleSave() {
    setSaving(true);
    try {
      const formData = form.getValues();
      const payload = {
        currentHeightCm: Number(formData.currentHeightCm),
        currentWeightKg: Number(formData.currentWeightKg),
        targetWeightKg: formData.targetWeightKg ? Number(formData.targetWeightKg) : null,
        targetBmi: formData.targetBmi ? Number(formData.targetBmi) : null,
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

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
          {/* Height */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-height">{t("height")} (cm)</Label>
            <Input
              id="goal-height"
              type="number"
              min={50}
              max={250}
              step={0.1}
              {...form.register("currentHeightCm", { valueAsNumber: true })}
              className="h-9"
            />
          </div>

          {/* Current Weight */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-current-weight">{t("currentWeight")} (kg)</Label>
            <Input
              id="goal-current-weight"
              type="number"
              min={20}
              max={300}
              step={0.1}
              {...form.register("currentWeightKg", { valueAsNumber: true })}
              className="h-9"
            />
          </div>

          {/* Target Weight */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-target-weight">{t("targetWeight")} (kg)</Label>
            <Input
              id="goal-target-weight"
              type="number"
              min={20}
              max={300}
              step={0.1}
              placeholder="63.5"
              {...form.register("targetWeightKg")}
              className="h-9"
            />
          </div>

          {/* Target BMI */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-target-bmi">{t("targetBmi")}</Label>
            <Input
              id="goal-target-bmi"
              type="number"
              min={10}
              max={50}
              step={0.1}
              placeholder="22.0"
              {...form.register("targetBmi")}
              className="h-9"
            />
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
