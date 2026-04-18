"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { useRouter } from "@/navigation";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OnboardingStep1 } from "@/components/onboarding/OnboardingStep1";
import { OnboardingStep2 } from "@/components/onboarding/OnboardingStep2";
import { OnboardingStep3 } from "@/components/onboarding/OnboardingStep3";
import { OnboardingStep4 } from "@/components/onboarding/OnboardingStep4";
import { OnboardingStep5 } from "@/components/onboarding/OnboardingStep5";
import { useNotification } from "@/hooks/use-notification";

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

const TOTAL_STEPS = 5;

// Step validation helpers
const StepValidators: Record<number, (data: OnboardingData) => { valid: boolean; errors: Record<string, string> }> = {
  1: (data) => {
    const errors: Record<string, string> = {};
    if (!data.fullName?.trim()) errors.fullName = "Họ và tên là bắt buộc";
    if (!data.dateOfBirth) errors.dateOfBirth = "Ngày sinh là bắt buộc";
    if (!data.gender) errors.gender = "Giới tính là bắt buộc";
    return { valid: Object.keys(errors).length === 0, errors };
  },
  2: (data) => {
    const errors: Record<string, string> = {};
    if (!data.heightCm || data.heightCm < 50 || data.heightCm > 250) {
      errors.heightCm = "Chiều cao không hợp lệ (50-250 cm)";
    }
    if (!data.weightKg || data.weightKg < 20 || data.weightKg > 300) {
      errors.weightKg = "Cân nặng không hợp lệ (20-300 kg)";
    }
    return { valid: Object.keys(errors).length === 0, errors };
  },
  3: (data) => {
    const errors: Record<string, string> = {};
    if (!data.phone?.trim()) errors.phone = "Số điện thoại là bắt buộc";
    // Validate phone format (Vietnamese format)
    else if (!/^[\d\s\+\-\(\)]{10,}$/.test(data.phone)) {
      errors.phone = "Số điện thoại không hợp lệ";
    }
    return { valid: Object.keys(errors).length === 0, errors };
  },
  4: (data) => {
    const errors: Record<string, string> = {};
    if (!data.emergencyContacts || data.emergencyContacts.length === 0) {
      errors.emergencyContacts = "Vui lòng thêm ít nhất 1 liên hệ khẩn cấp";
    } else {
      const invalidContacts = data.emergencyContacts
        .map((c, i) => {
          if (!c.name?.trim()) return i;
          if (!c.phone?.trim()) return i;
          if (!c.relationship?.trim()) return i;
          return -1;
        })
        .filter((i) => i >= 0);
      if (invalidContacts.length > 0) {
        errors.emergencyContacts = "Vui lòng điền đầy đủ thông tin liên hệ";
      }
    }
    return { valid: Object.keys(errors).length === 0, errors };
  },
  5: () => ({ valid: true, errors: {} }), // Medical info is optional
};

export default function OnboardingPageClient() {
  const router = useRouter();
  const { handleApiError, success, handleError } = useNotification();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Check if onboarding is already completed
  useEffect(() => {
    async function checkOnboardingStatus() {
      try {
        const res = await fetch("/api/v1/auth/session", { cache: "no-store", credentials: "include" });
        if (res.ok) {
          const sessionData = await res.json();
          if (sessionData?.data?.onboarding_status === "completed") {
            router.push("/dashboard");
          }
        }
      } catch {
        // Ignore errors, stay on onboarding
      }
    }
    checkOnboardingStatus();
  }, [router]);

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
    // Clear related field errors when data changes
    const updatedFields = Object.keys(updates);
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      updatedFields.forEach((field) => {
        delete newErrors[field];
      });
      return newErrors;
    });
  };

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const validateCurrentStep = (): boolean => {
    const validator = StepValidators[currentStep];
    if (!validator) return true;

    const { valid, errors } = validator(data);
    if (!valid) {
      setFieldErrors((prev) => ({ ...prev, ...errors }));
      setError("Vui lòng điền đầy đủ thông tin bắt buộc");
    } else {
      setFieldErrors({});
      setError(null);
    }
    return valid;
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    if (currentStep === TOTAL_STEPS) {
      await handleComplete();
    } else {
      setError(null);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = async () => {
    // Final validation
    if (!validateCurrentStep()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
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
          medical_info: data.medicalInfo ? {
            allergies: data.medicalInfo.allergies,
            chronic_conditions: data.medicalInfo.chronicConditions,
            current_medications: data.medicalInfo.currentMedications,
            notes: data.medicalInfo.notes,
          } : undefined,
          onboarding_completed: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errors = handleApiError(errorData, "Không thể lưu thông tin");
        // Map field errors
        if (errors && Object.keys(errors).length > 0) {
          setFieldErrors(errors);
        }
        return;
      }

      // Success
      success("Thông tin đã được lưu thành công!");
      router.push("/dashboard");
    } catch (err) {
      const errors = handleError(err, "Có lỗi xảy ra. Vui lòng thử lại.");
      if (errors && Object.keys(errors).length > 0) {
        setFieldErrors(errors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    const stepProps = {
      data,
      updateData,
      fieldErrors,
      clearFieldError
    };

    switch (currentStep) {
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
      default:
        return null;
    }
  };

  return (
    <OnboardingContext.Provider value={{ data, updateData, fieldErrors, clearFieldError }}>
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-b from-cyan-50 to-white dark:from-cyan-950/20 dark:to-background py-8 px-4">
        <div className="w-full max-w-2xl mx-auto">
          {/* Progress Stepper */}
          <div className="mb-12 px-2">
            <div className="flex items-start justify-between">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step, index) => (
                <div key={step} className={`flex items-center ${index < TOTAL_STEPS - 1 ? "flex-1" : ""}`}>
                  <div className="flex flex-col items-center relative">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                        transition-all duration-300
                        ${
                          step < currentStep
                            ? "bg-primary text-primary-foreground"
                            : step === currentStep
                            ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                            : "bg-muted text-muted-foreground"
                        }
                      `}
                    >
                      {step < currentStep ? (
                        <Check className="size-5" aria-hidden="true" />
                      ) : (
                        step
                      )}
                    </div>
                    <span className="text-xs mt-2 absolute top-11 text-muted-foreground hidden sm:block whitespace-nowrap">
                      {step === 1 && "Cơ bản"}
                      {step === 2 && "Sức khỏe"}
                      {step === 3 && "Liên hệ"}
                      {step === 4 && "Khẩn cấp"}
                      {step === 5 && "Y tế"}
                    </span>
                  </div>
                  {index < TOTAL_STEPS - 1 && (
                    <div
                      className={`
                        flex-1 h-1 mx-2 sm:mx-4 rounded transition-all duration-300
                        ${step < currentStep ? "bg-primary" : "bg-muted"}
                      `}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-card rounded-lg border shadow-sm p-6">
            {error && (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            {renderStep()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || isLoading}
            >
              Quay lại
            </Button>
            <Button onClick={handleNext} disabled={isLoading}>
              {isLoading && <Loader2 className="size-4 animate-spin mr-2" />}
              {currentStep === TOTAL_STEPS
                ? "Hoàn thành"
                : currentStep === TOTAL_STEPS - 1
                ? "Tiếp tục"
                : "Tiếp theo"}
              {currentStep < TOTAL_STEPS && <ChevronRight className="size-4 ml-2" />}
            </Button>
          </div>
        </div>
      </div>
    </OnboardingContext.Provider>
  );
}
