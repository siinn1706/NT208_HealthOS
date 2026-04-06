"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";

import { getProfileSchema, type ProfileFormValues } from "@/lib/validators/profile-schema";
import { bffFetchClient } from "@/lib/api-client";
import type { UserProfile, UserProfileUpdate } from "@/types/api";

import { ProfileHeader } from "./ProfileHeader";
import { BasicInfoSection } from "./BasicInfoSection";
import { BodyBasicsSection } from "./BodyBasicsSection";
import { ContactSection } from "./ContactSection";
import { EmergencyContactSection } from "./EmergencyContactSection";
import { MedicalBasicsSection } from "./MedicalBasicsSection";

interface ProfileFormProviderProps {
  profile: UserProfile;
}

function profileToFormValues(profile: UserProfile): ProfileFormValues {
  const emergencyContacts = Array.isArray(profile.emergency_contacts)
    ? profile.emergency_contacts
    : [];
  const medicalInfo = profile.medical_info ?? {
    allergies: null,
    chronic_conditions: null,
    current_medications: null,
    notes: null,
  };

  return {
    full_name: profile.full_name ?? profile.display_name ?? "",
    date_of_birth: profile.date_of_birth ?? null,
    gender: profile.gender ?? null,
    blood_type: profile.blood_type ?? null,
    height_cm: profile.height_cm ?? null,
    weight_kg: profile.weight_kg ?? null,
    phone: profile.phone ?? null,
    address: profile.address ?? null,
    emergency_contacts: emergencyContacts.map((ec) => ({
      name: ec.name ?? "",
      relationship: ec.relationship ?? "",
      phone: ec.phone ?? null,
    })),
    medical_info: {
      allergies: medicalInfo.allergies ?? null,
      chronic_conditions: medicalInfo.chronic_conditions ?? null,
      current_medications: medicalInfo.current_medications ?? null,
      notes: medicalInfo.notes ?? null,
    },
  };
}

function formValuesToUpdate(values: ProfileFormValues): UserProfileUpdate {
  return {
    full_name: values.full_name,
    date_of_birth: values.date_of_birth ?? null,
    gender: values.gender ?? null,
    blood_type: values.blood_type ?? null,
    height_cm: values.height_cm ?? null,
    weight_kg: values.weight_kg ?? null,
    phone: values.phone ?? null,
    address: values.address ?? null,
    emergency_contacts: values.emergency_contacts.map((ec) => ({
      name: ec.name,
      relationship: ec.relationship,
      phone: ec.phone ?? "",
    })),
    medical_info: {
      allergies: values.medical_info?.allergies ?? null,
      chronic_conditions: values.medical_info?.chronic_conditions ?? null,
      current_medications: values.medical_info?.current_medications ?? null,
      notes: values.medical_info?.notes ?? null,
    },
  };
}

export function ProfileFormProvider({ profile }: ProfileFormProviderProps) {
  const t = useTranslations("dashboard.profile");
  const tv = useTranslations();
  const profileSchema = useMemo(() => getProfileSchema(tv), [tv]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema) as Resolver<ProfileFormValues>,
    defaultValues: profileToFormValues(profile),
  });

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setSaveStatus("idle");
  }, []);

  const handleCancel = useCallback(() => {
    form.reset(profileToFormValues(profile));
    setAvatarPreview(null);
    setIsEditing(false);
    setSaveStatus("idle");
  }, [form, profile]);

  const handleAvatarChange = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  }, []);

  const handleSave = useCallback(async () => {
    const valid = await form.trigger();
    if (!valid) return;

    const values = form.getValues();
    setIsSaving(true);
    setSaveStatus("idle");
    setSaveError(null);

    const { data, error } = await bffFetchClient("/api/v1/users/me", {
      method: "PATCH",
      body: JSON.stringify(formValuesToUpdate(values)),
    });

    setIsSaving(false);

    if (error) {
      const errObj = error as Record<string, unknown>;
      const msg = (errObj?.error as Record<string, unknown>)?.message ?? errObj?.detail ?? null;
      setSaveError(typeof msg === "string" ? msg : null);
      setSaveStatus("error");
      return;
    }

    form.reset(data ? profileToFormValues(data as UserProfile) : values);
    router.refresh();
    setIsEditing(false);
    setSaveStatus("success");
    setTimeout(() => setSaveStatus("idle"), 3000);
  }, [form, router]);

  return (
    <TooltipProvider>
      <FormProvider {...form}>
        <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-5">
          {/* Header — avatar + name + edit/save/cancel buttons */}
          <ProfileHeader
            profile={profile}
            isEditing={isEditing}
            isSaving={isSaving}
            avatarPreview={avatarPreview}
            onEdit={handleEdit}
            onCancel={handleCancel}
            onSave={handleSave}
            onAvatarChange={handleAvatarChange}
          />

          {/* Save status banner */}
          {saveStatus === "success" && (
            <div
              role="status"
              className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800/40 dark:bg-green-900/20 dark:text-green-400"
            >
              ✓ {t("saveSuccess")}
            </div>
          )}
          {saveStatus === "error" && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              ✕ {saveError ?? t("saveError")}
            </div>
          )}

          {/* Section A — Basic Info */}
          <BasicInfoSection isEditing={isEditing} />

          {/* Section B — Body Basics */}
          <BodyBasicsSection isEditing={isEditing} />

          {/* Section C — Contact */}
          <ContactSection isEditing={isEditing} email={profile.email} />

          {/* Section D — Emergency Contact */}
          <EmergencyContactSection isEditing={isEditing} />

          {/* Section E — Medical Basics */}
          <MedicalBasicsSection isEditing={isEditing} />
        </form>
      </FormProvider>
    </TooltipProvider>
  );
}
