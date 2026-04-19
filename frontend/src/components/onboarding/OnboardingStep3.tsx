"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

interface OnboardingStep3Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  fieldErrors?: Record<string, string>;
  clearFieldError?: (field: string) => void;
}

export function OnboardingStep3({ data, updateData, fieldErrors = {}, clearFieldError }: OnboardingStep3Props) {
  const t = useTranslations("onboarding");

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">{t("step3.title")}</h2>
        <p className="text-muted-foreground">{t("step3.subtitle")}</p>
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">
          {t("step3.phone")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder={t("step3.phonePlaceholder")}
          value={data.phone || ""}
          onChange={(e) => {
            updateData({ phone: e.target.value });
            clearFieldError?.("phone");
          }}
          required
          aria-invalid={!!fieldErrors.phone}
        />
        {fieldErrors.phone && (
          <p className="text-xs text-destructive" role="alert">
            {fieldErrors.phone}
          </p>
        )}
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">{t("step3.address")}</Label>
        <Textarea
          id="address"
          placeholder={t("step3.addressPlaceholder")}
          value={data.address || ""}
          onChange={(e) => updateData({ address: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );
}
