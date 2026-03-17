"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2 } from "lucide-react";

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

interface OnboardingStep5Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  fieldErrors?: Record<string, string>;
  clearFieldError?: (field: string) => void;
}

export function OnboardingStep5({ data, updateData }: OnboardingStep5Props) {
  const updateMedicalInfo = (field: string, value: string) => {
    const current = data.medicalInfo || {};
    updateData({
      medicalInfo: {
        ...current,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Thông tin y tế</h2>
        <p className="text-muted-foreground">
          Thông tin này giúp chúng tôi chăm sóc sức khỏe tốt hơn cho bạn
        </p>
      </div>

      {/* Allergies */}
      <div className="space-y-2">
        <Label htmlFor="allergies">Dị ứng</Label>
        <Textarea
          id="allergies"
          placeholder="Ví dụ: Hải sản, thuốc penicillin..."
          value={data.medicalInfo?.allergies || ""}
          onChange={(e) => updateMedicalInfo("allergies", e.target.value)}
          rows={2}
        />
      </div>

      {/* Chronic Conditions */}
      <div className="space-y-2">
        <Label htmlFor="chronicConditions">Bệnh mãn tính</Label>
        <Textarea
          id="chronicConditions"
          placeholder="Ví dụ: Tiểu đường, cao huyết áp..."
          value={data.medicalInfo?.chronicConditions || ""}
          onChange={(e) => updateMedicalInfo("chronicConditions", e.target.value)}
          rows={2}
        />
      </div>

      {/* Current Medications */}
      <div className="space-y-2">
        <Label htmlFor="currentMedications">Thuốc đang sử dụng</Label>
        <Textarea
          id="currentMedications"
          placeholder="Ví dụ: Aspirin 100mg mỗi ngày..."
          value={data.medicalInfo?.currentMedications || ""}
          onChange={(e) => updateMedicalInfo("currentMedications", e.target.value)}
          rows={2}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Ghi chú thêm</Label>
        <Textarea
          id="notes"
          placeholder="Bất kỳ thông tin y tế nào bạn muốn chia sẻ..."
          value={data.medicalInfo?.notes || ""}
          onChange={(e) => updateMedicalInfo("notes", e.target.value)}
          rows={3}
        />
      </div>

      {/* Completion Info */}
      <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4 border border-green-200 dark:border-green-800">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="size-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-800 dark:text-green-200">
              Hoàn tất đăng ký
            </p>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Nhấn &quot;Hoàn thành&quot; để lưu thông tin và bắt đầu sử dụng HealthOS
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
