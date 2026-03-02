"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { User } from "lucide-react";

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProfileSection } from "./ProfileSection";
import type { ProfileFormValues } from "@/lib/validators/profile-schema";

interface BasicInfoSectionProps {
  isEditing: boolean;
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function ReadOnlyRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">
        {value ?? <span className="italic text-muted-foreground/60">—</span>}
      </p>
    </div>
  );
}

export function BasicInfoSection({ isEditing }: BasicInfoSectionProps) {
  const t = useTranslations("dashboard.profile");
  const form = useFormContext<ProfileFormValues>();

  const values = form.getValues();

  if (!isEditing) {
    const genderLabel = values.gender
      ? t(`genders.${values.gender}` as Parameters<typeof t>[0])
      : null;

    return (
      <ProfileSection icon={User} title={t("sections.basicInfo")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadOnlyRow label={t("fields.fullName")} value={values.full_name} />
          <ReadOnlyRow label={t("fields.dateOfBirth")} value={values.date_of_birth ?? null} />
          <ReadOnlyRow label={t("fields.gender")} value={genderLabel} />
          <ReadOnlyRow label={t("fields.bloodType")} value={values.blood_type ?? null} />
        </div>
      </ProfileSection>
    );
  }

  return (
    <ProfileSection icon={User} title={t("sections.basicInfo")}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Full Name */}
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.fullName")}</FormLabel>
              <FormControl>
                <Input placeholder="Nguyễn Văn A" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date of Birth */}
        <FormField
          control={form.control}
          name="date_of_birth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.dateOfBirth")}</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  max={new Date().toISOString().split("T")[0]}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Gender */}
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.gender")}</FormLabel>
              <Select
                value={field.value ?? ""}
                onValueChange={(v) =>
                  field.onChange(v === "" ? null : (v as "male" | "female" | "other"))
                }
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("placeholders.select")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="male">{t("genders.male")}</SelectItem>
                  <SelectItem value="female">{t("genders.female")}</SelectItem>
                  <SelectItem value="other">{t("genders.other")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Blood Type */}
        <FormField
          control={form.control}
          name="blood_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("fields.bloodType")}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({t("optional")})
                </span>
              </FormLabel>
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => field.onChange(v === "" ? null : v)}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("placeholders.select")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {BLOOD_TYPES.map((bt) => (
                    <SelectItem key={bt} value={bt}>
                      {bt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </ProfileSection>
  );
}
