"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";

interface OnboardingDataLite {
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

interface OnboardingReviewProps {
  data: OnboardingDataLite;
  onEditStep: (stepIndex: number) => void;
  consent: boolean;
  onConsentChange: (next: boolean) => void;
  consentError?: string | null;
}

/**
 * The final wizard step. Lets the user audit every section, jump back to fix
 * anything, and explicitly opt-in before submission. Consent is intentionally a
 * separate gate from "Submit" so the click resolves to a deliberate action.
 */
export function OnboardingReview({
  data,
  onEditStep,
  consent,
  onConsentChange,
  consentError,
}: OnboardingReviewProps) {
  const t = useTranslations("onboarding.review");
  const tStep1 = useTranslations("onboarding.step1");
  const tLabels = useTranslations("onboarding.review.labels");

  const genderLabel = data.gender ? tStep1(data.gender) : null;
  const notProvided = t("notProvided");

  const sections: Array<{
    key: string;
    title: string;
    editStepIndex: number;
    rows: Array<{ label: string; value: React.ReactNode }>;
  }> = [
    {
      key: "basics",
      title: t("sectionBasics"),
      editStepIndex: 1,
      rows: [
        { label: tStep1("fullName"), value: data.fullName || notProvided },
        { label: tStep1("dateOfBirth"), value: data.dateOfBirth || notProvided },
        { label: tStep1("gender"), value: genderLabel ?? notProvided },
        { label: tStep1("bloodType"), value: data.bloodType || notProvided },
      ],
    },
    {
      key: "health",
      title: t("sectionHealth"),
      editStepIndex: 2,
      rows: [
        {
          label: tLabels("height"),
          value: data.heightCm ? `${data.heightCm} cm` : notProvided,
        },
        {
          label: tLabels("weight"),
          value: data.weightKg ? `${data.weightKg} kg` : notProvided,
        },
      ],
    },
    {
      key: "contact",
      title: t("sectionContact"),
      editStepIndex: 3,
      rows: [
        { label: tLabels("phone"), value: data.phone || notProvided },
        { label: tLabels("address"), value: data.address || notProvided },
      ],
    },
    {
      key: "emergency",
      title: t("sectionEmergency"),
      editStepIndex: 4,
      rows: data.emergencyContacts && data.emergencyContacts.length > 0
        ? data.emergencyContacts.map((c, i) => ({
            label: `#${i + 1}`,
            value: (
              <span className="text-sm">
                {c.name || notProvided}
                {c.phone ? ` · ${c.phone}` : ""}
                {c.relationship ? ` · ${c.relationship}` : ""}
              </span>
            ),
          }))
        : [{ label: "—", value: t("noContacts") }],
    },
    {
      key: "medical",
      title: t("sectionMedical"),
      editStepIndex: 5,
      rows: [
        { label: tLabels("allergies"), value: data.medicalInfo?.allergies || notProvided },
        { label: tLabels("conditions"), value: data.medicalInfo?.chronicConditions || notProvided },
        { label: tLabels("medications"), value: data.medicalInfo?.currentMedications || notProvided },
        { label: tLabels("notes"), value: data.medicalInfo?.notes || notProvided },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-foreground">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <section
            key={section.key}
            className="rounded-lg border border-border bg-card"
          >
            <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
              <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onEditStep(section.editStepIndex)}
                className="h-7 gap-1 text-xs"
              >
                <Pencil className="size-3" aria-hidden />
                {t("edit")}
              </Button>
            </header>
            <dl className="divide-y divide-border text-sm">
              {section.rows.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[120px_1fr] gap-3 px-4 py-2"
                >
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {row.label}
                  </dt>
                  <dd className="min-w-0 text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox
            id="onboarding-consent"
            checked={consent}
            onCheckedChange={(value) => onConsentChange(value === true)}
            aria-describedby="onboarding-consent-body"
            aria-invalid={!!consentError || undefined}
          />
          <div className="space-y-1">
            <Label htmlFor="onboarding-consent" className="text-sm font-medium">
              {t("consentTitle")}
            </Label>
            <p
              id="onboarding-consent-body"
              className="text-xs text-muted-foreground leading-relaxed"
            >
              {t("consentBody")}
            </p>
          </div>
        </div>
        {consentError && (
          <p className="text-xs text-destructive" role="alert">
            {consentError}
          </p>
        )}
      </div>
    </div>
  );
}
