"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

interface OnboardingStep3Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  fieldErrors?: Record<string, string>;
  clearFieldError?: (field: string) => void;
}

export function OnboardingStep3({ data, updateData, fieldErrors = {}, clearFieldError }: OnboardingStep3Props) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Thông tin liên hệ</h2>
        <p className="text-muted-foreground">Chúng tôi cần thông tin này để liên lạc với bạn</p>
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">
          Số điện thoại <span className="text-destructive">*</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+84 987 654 321"
          value={data.phone || ""}
          onChange={(e) => {
            updateData({ phone: e.target.value });
            clearFieldError?.("phone");
          }}
          required
          aria-invalid={!!fieldErrors.phone}
        />
        {fieldErrors.phone && (
          <p className="text-xs text-destructive" role="alert">
            {fieldErrors.phone}
          </p>
        )}
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">Địa chỉ</Label>
        <Textarea
          id="address"
          placeholder="123 Đường ABC, Quận XYZ, TP. Hồ Chí Minh"
          value={data.address || ""}
          onChange={(e) => updateData({ address: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );
}
