"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "@/navigation";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { OnboardingStep1 } from "@/components/onboarding/OnboardingStep1";
import { OnboardingStep2 } from "@/components/onboarding/OnboardingStep2";
import { OnboardingStep3 } from "@/components/onboarding/OnboardingStep3";
import { OnboardingStep4 } from "@/components/onboarding/OnboardingStep4";
import { OnboardingStep5 } from "@/components/onboarding/OnboardingStep5";
import { OnboardingWelcome } from "@/components/onboarding/OnboardingWelcome";
import { OnboardingReview } from "@/components/onboarding/OnboardingReview";
import { Stepper, type StepperItem } from "@/components/shared/page";
import { InlineNotice } from "@/components/shared/state";
import { useNotification } from "@/hooks/use-notification";
import { useOnboardingDraft } from "@/hooks/useOnboardingDraft";
import { track } from "@/lib/analytics";

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

interface OnboardingContextType {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  fieldErrors: Record<string, string>;
  clearFieldError: (field: string) => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingPage");
  }
  return context;
}

// Step indices:
//   0 = Welcome
//   1 = Basics
//   2 = Health
//   3 = Contact
//   4 = Emergency
//   5 = Medical (optional)
//   6 = Review & confirm
const FIRST_STEP = 0;
const LAST_STEP = 6;

const INITIAL_DATA: OnboardingData = {};

type StepValidator = (
  data: OnboardingData,
  t: (key: string) => string,
) => Record<string, string>;

const STEP_VALIDATORS: Record<number, StepValidator> = {
  1: (data, t) => {
    const errors: Record<string, string> = {};
    if (!data.fullName?.trim()) errors.fullName = t("step1.fullNameRequired");
    if (!data.dateOfBirth) errors.dateOfBirth = t("step1.dateOfBirthRequired");
    if (!data.gender) errors.gender = t("step1.genderRequired");
    return errors;
  },
  2: (data, t) => {
    const errors: Record<string, string> = {};
    if (!data.heightCm || data.heightCm < 50 || data.heightCm > 250) {
      errors.heightCm = t("step2.heightInvalid");
    }
    if (!data.weightKg || data.weightKg < 20 || data.weightKg > 300) {
      errors.weightKg = t("step2.weightInvalid");
    }
    return errors;
  },
  3: (data, t) => {
    const errors: Record<string, string> = {};
    if (!data.phone?.trim()) {
      errors.phone = t("step3.phoneRequired");
    } else if (!/^[\d\s+\-()]{10,}$/.test(data.phone)) {
      errors.phone = t("step3.phoneInvalid");
    }
    return errors;
  },
  4: (data, t) => {
    const errors: Record<string, string> = {};
    if (!data.emergencyContacts || data.emergencyContacts.length === 0) {
      errors.emergencyContacts = t("step4.errorAtLeastOne");
      return errors;
    }
    const incomplete = data.emergencyContacts.some(
      (c) => !c.name?.trim() || !c.phone?.trim() || !c.relationship?.trim(),
    );
    if (incomplete) {
      errors.emergencyContacts = t("step4.errorIncomplete");
    }
    return errors;
  },
};

function clampStep(value: number): number {
  if (Number.isNaN(value)) return FIRST_STEP;
  return Math.min(Math.max(value, FIRST_STEP), LAST_STEP);
}

function formatRelativeTime(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function OnboardingPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { handleApiError, success, handleError } = useNotification();
  const t = useTranslations("onboarding");

  const draft = useOnboardingDraft<OnboardingData>(INITIAL_DATA);

  // Initialize from URL ?step=N once we've hydrated, so refresh restores you.
  const initialStep = useMemo(() => {
    const raw = searchParams.get("step");
    return clampStep(raw ? parseInt(raw, 10) : FIRST_STEP);
  }, [searchParams]);
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validationSummary, setValidationSummary] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  // Keep `?step=N` in sync with state (replace, not push, so back button skips
  // the wizard rather than walking through each step).
  useEffect(() => {
    if (!draft.hydrated) return;
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    const next = String(currentStep);
    if (params.get("step") !== next) {
      params.set("step", next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [currentStep, draft.hydrated, pathname, router, searchParams]);

  useEffect(() => {
    track("onboarding.viewed", { initialStep });
    // initialStep is captured at mount; we don't want to re-fire when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!draft.hydrated) return;
    if (draft.status === "saved") {
      track("onboarding.draft.saved", { step: currentStep });
    } else if (draft.status === "error") {
      track("onboarding.draft.failed", {
        step: currentStep,
        error: draft.lastError?.message,
      });
    }
  }, [draft.hydrated, draft.status, draft.lastError, currentStep]);

  const updateData = useCallback(
    (updates: Partial<OnboardingData>) => {
      draft.setData((prev) => ({ ...prev, ...updates }));
      const updatedFields = Object.keys(updates);
      setFieldErrors((prev) => {
        const next = { ...prev };
        updatedFields.forEach((field) => {
          delete next[field];
        });
        return next;
      });
      setValidationSummary(null);
    },
    [draft],
  );

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  function validateCurrentStep(): boolean {
    const validator = STEP_VALIDATORS[currentStep];
    if (!validator) {
      setFieldErrors({});
      setValidationSummary(null);
      return true;
    }
    const errors = validator(
      draft.data,
      t as unknown as (key: string) => string,
    );
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setValidationSummary(t("validation.summary"));
      return false;
    }
    setFieldErrors({});
    setValidationSummary(null);
    return true;
  }

  function goToStep(next: number) {
    setCurrentStep(clampStep(next));
    setValidationSummary(null);
    setSubmitError(null);
  }

  function handleNext() {
    if (currentStep === LAST_STEP) return;
    if (!validateCurrentStep()) return;
    track("onboarding.step_advanced", { from: currentStep, to: currentStep + 1 });
    goToStep(currentStep + 1);
  }

  function handleBack() {
    if (currentStep === FIRST_STEP) return;
    track("onboarding.step_back", { from: currentStep, to: currentStep - 1 });
    goToStep(currentStep - 1);
  }

  async function handleSubmit() {
    if (!consent) {
      setConsentError(t("review.consentRequired"));
      return;
    }
    setConsentError(null);
    setIsSubmitting(true);
    setSubmitError(null);

    // Flush any pending draft writes before we try to submit.
    draft.flush();

    try {
      const data = draft.data;
      const response = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          full_name: data.fullName,
          date_of_birth: data.dateOfBirth,
          gender: data.gender?.toLowerCase(),
          blood_type: data.bloodType?.toUpperCase(),
          height_cm: data.heightCm,
          weight_kg: data.weightKg,
          phone: data.phone,
          address: data.address,
          emergency_contacts: data.emergencyContacts,
          medical_info: data.medicalInfo
            ? {
                allergies: data.medicalInfo.allergies,
                chronic_conditions: data.medicalInfo.chronicConditions,
                current_medications: data.medicalInfo.currentMedications,
                notes: data.medicalInfo.notes,
              }
            : undefined,
          onboarding_completed: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errors = handleApiError(errorData, t("saveError"));
        if (errors && Object.keys(errors).length > 0) {
          setFieldErrors(errors);
        }
        setSubmitError(t("saveError"));
        return;
      }

      track("onboarding.completed");
      success(t("saveSuccess"));
      draft.clear();
      router.push("/dashboard");
    } catch (err) {
      const errors = handleError(err, t("saveGenericError"));
      if (errors && Object.keys(errors).length > 0) {
        setFieldErrors(errors);
      }
      setSubmitError(t("saveGenericError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Build the visible Stepper. The Welcome + Review steps don't get their own
  // pill — the stepper reflects the five data steps so progress feels concrete.
  const stepperItems: StepperItem[] = [
    { id: "basics", label: t("stepLabels.basics") },
    { id: "health", label: t("stepLabels.health") },
    { id: "contact", label: t("stepLabels.contact") },
    { id: "emergency", label: t("stepLabels.emergency") },
    { id: "medical", label: t("stepLabels.medical"), optional: true },
  ];
  // Map step index → stepper active index. Welcome (0) shows step 1 unfilled,
  // Review (6) shows all five filled.
  const stepperActiveIndex = currentStep === 0
    ? -1
    : currentStep === LAST_STEP
      ? stepperItems.length
      : currentStep - 1;

  function renderStep() {
    const stepProps = {
      data: draft.data,
      updateData,
      fieldErrors,
      clearFieldError,
    } as const;

    switch (currentStep) {
      case 0:
        return <OnboardingWelcome />;
      case 1:
        return <OnboardingStep1 {...stepProps} />;
      case 2:
        return <OnboardingStep2 {...stepProps} />;
      case 3:
        return <OnboardingStep3 {...stepProps} />;
      case 4:
        return <OnboardingStep4 {...stepProps} />;
      case 5:
        return <OnboardingStep5 {...stepProps} />;
      case 6:
        return (
          <OnboardingReview
            data={draft.data}
            onEditStep={goToStep}
            consent={consent}
            onConsentChange={(next) => {
              setConsent(next);
              if (next) setConsentError(null);
            }}
            consentError={consentError}
          />
        );
      default:
        return null;
    }
  }

  const draftIndicator = useMemo(() => {
    if (!draft.hydrated) return null;
    if (draft.status === "error") {
      return (
        <InlineNotice variant="warning">
          {t("draft.saveFailed")}
        </InlineNotice>
      );
    }
    if (draft.status === "saving") {
      return (
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {t("draft.saving")}
        </span>
      );
    }
    if (draft.status === "saved" && draft.lastSavedAt) {
      return (
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {t("draft.savedAt", { time: formatRelativeTime(draft.lastSavedAt) })}
        </span>
      );
    }
    return null;
  }, [draft.hydrated, draft.lastSavedAt, draft.status, t]);

  return (
    <OnboardingContext.Provider
      value={{
        data: draft.data,
        updateData,
        fieldErrors,
        clearFieldError,
      }}
    >
      <div className="min-h-[100dvh] bg-gradient-to-b from-cyan-50 to-white py-8 px-4 dark:from-cyan-950/20 dark:to-background">
        <div className="mx-auto w-full max-w-2xl">
          {/* Stepper */}
          <div className="mb-6">
            <Stepper
              steps={stepperItems}
              activeIndex={stepperActiveIndex}
              navigableIndexes={Array.from(
                { length: Math.min(Math.max(0, stepperActiveIndex + 1), stepperItems.length) },
                (_, i) => i,
              )}
              onStepClick={(i) => goToStep(i + 1)}
              ariaLabel={t("welcome.title")}
              optionalLabel={t("optional")}
            />
          </div>

          {/* Step Content */}
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            {validationSummary && (
              <div
                className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {validationSummary}
              </div>
            )}
            {submitError && (
              <div
                className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {submitError}
              </div>
            )}
            {!draft.hydrated ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
              </div>
            ) : (
              renderStep()
            )}
          </div>

          {/* Navigation */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-[1.25rem] order-2 sm:order-1">{draftIndicator}</div>
            <div className="order-1 flex items-center justify-between gap-2 sm:order-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === FIRST_STEP || isSubmitting}
              >
                <ChevronLeft className="mr-1 size-4" aria-hidden />
                {t("nav.back")}
              </Button>
              {currentStep === LAST_STEP ? (
                <Button onClick={handleSubmit} disabled={isSubmitting || !consent}>
                  {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
                  {isSubmitting ? t("nav.submitting") : t("nav.submit")}
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={isSubmitting}>
                  {t("nav.next")}
                  <ChevronRight className="ml-1 size-4" aria-hidden />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </OnboardingContext.Provider>
  );
}
