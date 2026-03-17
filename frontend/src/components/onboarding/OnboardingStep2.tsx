"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

interface OnboardingStep2Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  fieldErrors?: Record<string, string>;
  clearFieldError?: (field: string) => void;
}

export function OnboardingStep2({ data, updateData, fieldErrors = {}, clearFieldError }: OnboardingStep2Props) {
  const bmi = useMemo(() => {
    if (!data.heightCm || !data.weightKg || data.heightCm <= 0) return null;
    const heightM = data.heightCm / 100;
    return (data.weightKg / (heightM * heightM)).toFixed(1);
  }, [data.heightCm, data.weightKg]);

  const bmiCategory = useMemo(() => {
    if (!bmi) return null;
    const value = parseFloat(bmi);
    if (value < 18.5) return { label: "Thiếu cân", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950" };
    if (value < 25) return { label: "Bình thường", color: "text-green-500", bg: "bg-green-50 dark:bg-green-950" };
    if (value < 30) return { label: "Thừa cân", color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950" };
    return { label: "Béo phì", color: "text-red-500", bg: "bg-red-50 dark:bg-red-950" };
  }, [bmi]);

  const handleHeightChange = (value: string) => {
    const num = parseFloat(value) || 0;
    updateData({ heightCm: num });
    clearFieldError?.("heightCm");
  };

  const handleWeightChange = (value: string) => {
    const num = parseFloat(value) || 0;
    updateData({ weightKg: num });
    clearFieldError?.("weightKg");
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Chiều cao & Cân nặng</h2>
        <p className="text-muted-foreground">Thông tin này giúp chúng tôi tính chỉ số BMI của bạn</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Height */}
        <div className="space-y-2">
          <Label htmlFor="heightCm">
            Chiều cao (cm) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="heightCm"
            type="number"
            placeholder="170"
            value={data.heightCm || ""}
            onChange={(e) => handleHeightChange(e.target.value)}
            min={50}
            max={250}
            required
            aria-invalid={!!fieldErrors.heightCm}
          />
          {fieldErrors.heightCm && (
            <p className="text-xs text-destructive" role="alert">
              {fieldErrors.heightCm}
            </p>
          )}
        </div>

        {/* Weight */}
        <div className="space-y-2">
          <Label htmlFor="weightKg">
            Cân nặng (kg) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="weightKg"
            type="number"
            placeholder="65"
            value={data.weightKg || ""}
            onChange={(e) => handleWeightChange(e.target.value)}
            min={20}
            max={300}
            required
            aria-invalid={!!fieldErrors.weightKg}
          />
          {fieldErrors.weightKg && (
            <p className="text-xs text-destructive" role="alert">
              {fieldErrors.weightKg}
            </p>
          )}
        </div>
      </div>

      {/* BMI Display */}
      {bmi && bmiCategory && (
        <div className={`rounded-lg p-4 ${bmiCategory.bg}`}>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Chỉ số BMI của bạn</p>
            <p className="text-4xl font-bold">{bmi}</p>
            <p className={`font-medium mt-1 ${bmiCategory.color}`}>
              {bmiCategory.label}
            </p>
          </div>
          <div className="mt-4 text-xs text-muted-foreground text-center">
            {parseFloat(bmi) < 18.5 && "Bạn nên tăng cân để có sức khỏe tốt hơn."}
            {parseFloat(bmi) >= 18.5 && parseFloat(bmi) < 25 && "Bạn có cân nặng bình thường. Giữ gìn sức khỏe tốt!"}
            {parseFloat(bmi) >= 25 && parseFloat(bmi) < 30 && "Bạn nên giảm cân để có sức khỏe tốt hơn."}
            {parseFloat(bmi) >= 30 && "Bạn nên tham khảo ý kiến bác sĩ về việc quản lý cân nặng."}
          </div>
        </div>
      )}

      {!bmi && (
        <div className="rounded-lg p-4 bg-muted text-center">
          <p className="text-muted-foreground text-sm">
            Nhập chiều cao và cân nặng để tính BMI
          </p>
        </div>
      )}
    </div>
  );
}
