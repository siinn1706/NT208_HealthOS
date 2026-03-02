"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Stethoscope } from "lucide-react";

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ProfileSection } from "./ProfileSection";
import type { ProfileFormValues } from "@/lib/validators/profile-schema";

interface MedicalBasicsSectionProps {
  isEditing: boolean;
}

function MedicalReadOnlyRow({
  label,
  value,
  notSpecified,
}: {
  label: string;
  value: string | null | undefined;
  notSpecified: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
        {value ? (
          value
        ) : (
          <span className="italic text-muted-foreground/60">{notSpecified}</span>
        )}
      </p>
    </div>
  );
}

export function MedicalBasicsSection({ isEditing }: MedicalBasicsSectionProps) {
  const t = useTranslations("dashboard.profile");
  const form = useFormContext<ProfileFormValues>();
  const values = form.getValues();

  if (!isEditing) {
    return (
      <ProfileSection icon={Stethoscope} title={t("sections.medical")}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <MedicalReadOnlyRow
            label={t("fields.allergies")}
            value={values.medical_info?.allergies}
            notSpecified={t("notSpecified")}
          />
          <MedicalReadOnlyRow
            label={t("fields.chronicConditions")}
            value={values.medical_info?.chronic_conditions}
            notSpecified={t("notSpecified")}
          />
          <MedicalReadOnlyRow
            label={t("fields.currentMedications")}
            value={values.medical_info?.current_medications}
            notSpecified={t("notSpecified")}
          />
          <MedicalReadOnlyRow
            label={t("fields.notes")}
            value={values.medical_info?.notes}
            notSpecified={t("notSpecified")}
          />
        </div>
      </ProfileSection>
    );
  }

  return (
    <ProfileSection icon={Stethoscope} title={t("sections.medical")}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Allergies */}
        <FormField
          control={form.control}
          name="medical_info.allergies"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.allergies")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("placeholders.allergies")}
                  className="resize-none"
                  rows={3}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Chronic Conditions */}
        <FormField
          control={form.control}
          name="medical_info.chronic_conditions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.chronicConditions")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("placeholders.chronicConditions")}
                  className="resize-none"
                  rows={3}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Current Medications */}
        <FormField
          control={form.control}
          name="medical_info.current_medications"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.currentMedications")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("placeholders.currentMedications")}
                  className="resize-none"
                  rows={3}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="medical_info.notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.notes")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("placeholders.notes")}
                  className="resize-none"
                  rows={3}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </ProfileSection>
  );
}
