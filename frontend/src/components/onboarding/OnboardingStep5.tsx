"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2 } from "lucide-react";

interface OnboardingData {
  fullName?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  bloodType?: string;
  heightCm?: number;
  weightKg?: number;
  phone?: string;
  address?: string;
  emergencyContacts?: Array<{
    name: string;
    email?: string;
    phone: string;
    relationship: string;
  }>;
  medicalInfo?: {
    allergies?: string;
    chronicConditions?: string;
    currentMedications?: string;
    notes?: string;
  };
}

interface OnboardingStep5Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  fieldErrors?: Record<string, string>;
  clearFieldError?: (field: string) => void;
}

export function OnboardingStep5({ data, updateData }: OnboardingStep5Props) {
  const t = useTranslations("onboarding");

  const updateMedicalInfo = (field: string, value: string) => {
    const current = data.medicalInfo || {};
    updateData({
      medicalInfo: {
        ...current,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">{t("step5.title")}</h2>
        <p className="text-muted-foreground">
          {t("step5.subtitle")}
        </p>
      </div>

      {/* Allergies */}
      <div className="space-y-2">
        <Label htmlFor="allergies">{t("step5.allergies")}</Label>
        <Textarea
          id="allergies"
          placeholder={t("step5.allergiesPlaceholder")}
          value={data.medicalInfo?.allergies || ""}
          onChange={(e) => updateMedicalInfo("allergies", e.target.value)}
          rows={2}
        />
      </div>

      {/* Chronic Conditions */}
      <div className="space-y-2">
        <Label htmlFor="chronicConditions">{t("step5.chronicConditions")}</Label>
        <Textarea
          id="chronicConditions"
          placeholder={t("step5.chronicConditionsPlaceholder")}
          value={data.medicalInfo?.chronicConditions || ""}
          onChange={(e) => updateMedicalInfo("chronicConditions", e.target.value)}
          rows={2}
        />
      </div>

      {/* Current Medications */}
      <div className="space-y-2">
        <Label htmlFor="currentMedications">{t("step5.currentMedications")}</Label>
        <Textarea
          id="currentMedications"
          placeholder={t("step5.currentMedicationsPlaceholder")}
          value={data.medicalInfo?.currentMedications || ""}
          onChange={(e) => updateMedicalInfo("currentMedications", e.target.value)}
          rows={2}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">{t("step5.notes")}</Label>
        <Textarea
          id="notes"
          placeholder={t("step5.notesPlaceholder")}
          value={data.medicalInfo?.notes || ""}
          onChange={(e) => updateMedicalInfo("notes", e.target.value)}
          rows={3}
        />
      </div>

      {/* Completion Info */}
      <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4 border border-green-200 dark:border-green-800">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="size-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-800 dark:text-green-200">
              {t("step5.complete")}
            </p>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              {t("step5.completeHint")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
