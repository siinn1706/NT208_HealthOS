"use client";

import { use, useCallback, useMemo, useState, createContext, ReactNode } from "react";
import { useRouter } from "@/navigation";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingData {
  // Step 1
  fullName?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  bloodType?: string;
  // Step 2
  heightCm?: number;
  weightKg?: number;
  // Step 3
  phone?: string;
  address?: string;
  // Step 4
  emergencyContacts?: Array<{
    name: string;
    email?: string;
    phone: string;
    relationship: string;
  }>;
  // Step 5
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
  currentStep: number;
  totalSteps: number;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function useOnboarding() {
  const context = use(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingWizard");
  }
  return context;
}

interface OnboardingWizardProps {
  children: ReactNode;
  totalSteps: number;
  onComplete: () => Promise<void>;
}

export function OnboardingWizard({ children, totalSteps, onComplete }: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({});
  const [isLoading, setIsLoading] = useState(false);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleNext = async () => {
    if (currentStep === totalSteps) {
      setIsLoading(true);
      try {
        await onComplete();
        router.push("/dashboard");
      } catch (error) {
        console.error("Onboarding completion failed:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const contextValue = useMemo(
    () => ({
        data,
        updateData,
        currentStep,
        totalSteps,
        isLoading,
        setIsLoading,
    }),
    [currentStep, data, isLoading, totalSteps, updateData],
  );

  return (
    <OnboardingContext.Provider value={contextValue}>
      <div className="w-full max-w-2xl mx-auto">
        {/* Progress Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step, index) => (
              <div key={step} className={`flex items-center ${index < totalSteps - 1 ? "flex-1" : ""}`}>
                  <div className="flex flex-col items-center min-w-[50px] sm:min-w-[80px]">
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
                  <span className="text-xs mt-2 text-muted-foreground hidden sm:block">
                    {step === 1 && "Cơ bản"}
                    {step === 2 && "Sức khỏe"}
                    {step === 3 && "Liên hệ"}
                    {step === 4 && "Khẩn cấp"}
                    {step === 5 && "Y tế"}
                  </span>
                </div>
                {index < totalSteps - 1 && (
                  <div
                    className={`
                      flex-1 h-1 mx-2 rounded transition-all duration-300
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
          {children}
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
            {currentStep === totalSteps
              ? "Hoàn thành"
              : currentStep === totalSteps - 1
              ? "Tiếp tục"
              : "Tiếp theo"}
            {currentStep < totalSteps && <ChevronRight className="size-4 ml-2" />}
          </Button>
        </div>
      </div>
    </OnboardingContext.Provider>
  );
}
