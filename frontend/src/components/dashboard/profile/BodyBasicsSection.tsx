"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Weight } from "lucide-react";

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProfileSection } from "./ProfileSection";
import type { ProfileFormValues } from "@/lib/validators/profile-schema";

interface BodyBasicsSectionProps {
  isEditing: boolean;
}

function calcBmi(
  height: number | null | undefined,
  weight: number | null | undefined
): number | null {
  if (!height || !weight || height <= 0 || weight <= 0) return null;
  return weight / ((height / 100) * (height / 100));
}

function BmiDisplay({
  bmi,
  t,
}: {
  bmi: number | null;
  t: ReturnType<typeof useTranslations>;
}) {
  if (bmi === null) return null;

  let category: string;
  let variant: "secondary" | "destructive" | "outline" | "default";

  if (bmi < 18.5) {
    category = t("bmi.underweight");
    variant = "outline";
  } else if (bmi < 25) {
    category = t("bmi.normal");
    variant = "secondary";
  } else if (bmi < 30) {
    category = t("bmi.overweight");
    variant = "outline";
  } else {
    category = t("bmi.obese");
    variant = "destructive";
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{t("bmi.label")}:</span>
      <span className="text-sm font-semibold text-foreground">{bmi.toFixed(1)}</span>
      <Badge variant={variant} className="text-xs">
        {category}
      </Badge>
    </div>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">
        {value != null ? (
          value
        ) : (
          <span className="italic text-muted-foreground/60">N/A</span>
        )}
      </p>
    </div>
  );
}

export function BodyBasicsSection({ isEditing }: BodyBasicsSectionProps) {
  const t = useTranslations("dashboard.profile");
  const form = useFormContext<ProfileFormValues>();

  // Live values for BMI recalculation
  const heightVal = useWatch({ control: form.control, name: "height_cm" });
  const weightVal = useWatch({ control: form.control, name: "weight_kg" });

  const numHeight =
    typeof heightVal === "number"
      ? heightVal
      : heightVal
        ? Number(heightVal)
        : null;
  const numWeight =
    typeof weightVal === "number"
      ? weightVal
      : weightVal
        ? Number(weightVal)
        : null;

  const bmi = calcBmi(numHeight, numWeight);

  if (!isEditing) {
    const rawH = form.getValues("height_cm");
    const rawW = form.getValues("weight_kg");
    const h = typeof rawH === "number" ? rawH : rawH ? Number(rawH) : null;
    const w = typeof rawW === "number" ? rawW : rawW ? Number(rawW) : null;

    return (
      <ProfileSection icon={Weight} title={t("sections.bodyBasics")}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ReadOnlyRow label={`${t("fields.heightCm")} (cm)`} value={h} />
            <ReadOnlyRow label={`${t("fields.weightKg")} (kg)`} value={w} />
          </div>
          <BmiDisplay bmi={calcBmi(h, w)} t={t} />
        </div>
      </ProfileSection>
    );
  }

  return (
    <ProfileSection icon={Weight} title={t("sections.bodyBasics")}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Height */}
          <FormField
            control={form.control}
            name="height_cm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.heightCm")} (cm)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={50}
                    max={300}
                    step={0.1}
                    placeholder="172"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Weight */}
          <FormField
            control={form.control}
            name="weight_kg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.weightKg")} (kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={10}
                    max={500}
                    step={0.1}
                    placeholder="68"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Live BMI */}
        <BmiDisplay bmi={bmi} t={t} />
      </div>
    </ProfileSection>
  );
}
