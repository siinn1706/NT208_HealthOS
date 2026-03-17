"use client";

import { useState, useCallback } from "react";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { TooltipProvider } from "@/components/ui/tooltip";

import { profileSchema, type ProfileFormValues } from "@/lib/validators/profile-schema";
import { bffFetch } from "@/lib/api-client";
import type { UserProfile } from "@/types/api";

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
      id: ec.id,
      name: ec.name ?? null,
      relationship: ec.relationship ?? null,
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

export function ProfileFormProvider({ profile }: ProfileFormProviderProps) {
  const t = useTranslations("dashboard.profile");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

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

    try {
      // BFF: PATCH /api/v1/users/me
      const res = await bffFetch("/api/v1/users/me", {
        method: "PATCH",
        body: values,
      });
      void res; // BFF returns updated user, can be used to sync local state

      form.reset(values); // set new defaults to prevent stale "dirty" state
      setIsEditing(false);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      console.error("[ProfileFormProvider] Save failed:", err);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  }, [form]);

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
              ✕ {t("saveError")}
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
