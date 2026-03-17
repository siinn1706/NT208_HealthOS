"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

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

interface OnboardingStep1Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  fieldErrors?: Record<string, string>;
  clearFieldError?: (field: string) => void;
}

export function OnboardingStep1({ data, updateData, fieldErrors = {}, clearFieldError }: OnboardingStep1Props) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Thông tin cơ bản</h2>
        <p className="text-muted-foreground">Hãy cho chúng tôi biết một chút về bạn</p>
      </div>

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="fullName">
          Họ và tên <span className="text-destructive">*</span>
        </Label>
        <Input
          id="fullName"
          placeholder="Nguyễn Văn A"
          value={data.fullName || ""}
          onChange={(e) => {
            updateData({ fullName: e.target.value });
            clearFieldError?.("fullName");
          }}
          required
          aria-invalid={!!fieldErrors.fullName}
        />
        {fieldErrors.fullName && (
          <p className="text-xs text-destructive" role="alert">
            {fieldErrors.fullName}
          </p>
        )}
      </div>

      {/* Date of Birth */}
      <div className="space-y-2">
        <Label htmlFor="dateOfBirth">
          Ngày sinh <span className="text-destructive">*</span>
        </Label>
        <Input
          id="dateOfBirth"
          type="date"
          value={data.dateOfBirth || ""}
          onChange={(e) => {
            updateData({ dateOfBirth: e.target.value });
            clearFieldError?.("dateOfBirth");
          }}
          required
          aria-invalid={!!fieldErrors.dateOfBirth}
          className="[color-scheme:light] dark:[color-scheme:dark]"
        />
        {fieldErrors.dateOfBirth && (
          <p className="text-xs text-destructive" role="alert">
            {fieldErrors.dateOfBirth}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Gender */}
        <div className="space-y-2">
          <Label htmlFor="gender">
            Giới tính <span className="text-destructive">*</span>
          </Label>
          <Select
            value={data.gender || ""}
            onValueChange={(value: "male" | "female" | "other") => {
              updateData({ gender: value });
              clearFieldError?.("gender");
            }}
          >
            <SelectTrigger id="gender" aria-invalid={!!fieldErrors.gender}>
              <SelectValue placeholder="Chọn giới tính" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Nam</SelectItem>
              <SelectItem value="female">Nữ</SelectItem>
              <SelectItem value="other">Khác</SelectItem>
            </SelectContent>
          </Select>
          {fieldErrors.gender && (
            <p className="text-xs text-destructive" role="alert">
              {fieldErrors.gender}
            </p>
          )}
        </div>

        {/* Blood Type */}
        <div className="space-y-2">
          <Label htmlFor="bloodType">Nhóm máu</Label>
          <Select
            value={data.bloodType || ""}
            onValueChange={(value: string) => updateData({ bloodType: value })}
          >
            <SelectTrigger id="bloodType">
              <SelectValue placeholder="Chọn nhóm máu" />
            </SelectTrigger>
            <SelectContent>
              {BLOOD_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
