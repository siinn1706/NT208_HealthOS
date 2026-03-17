"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RELATIONSHIPS = [
  "Vợ/Chồng",
  "Cha/Mẹ",
  "Anh/Chị em",
  "Con cái",
  "Bạn bè",
  "Đồng nghiệp",
  "Khác",
];

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

interface OnboardingStep4Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  fieldErrors?: Record<string, string>;
  clearFieldError?: (field: string) => void;
}

interface EmergencyContactForm {
  name: string;
  phone: string;
  relationship: string;
  email?: string;
}

export function OnboardingStep4({ data, updateData, fieldErrors = {}, clearFieldError }: OnboardingStep4Props) {
  const [contacts, setContacts] = useState<EmergencyContactForm[]>(
    data.emergencyContacts || [{ name: "", phone: "", relationship: "" }]
  );

  const updateContact = (index: number, field: keyof EmergencyContactForm, value: string) => {
    const newContacts = [...contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setContacts(newContacts);
    updateData({ emergencyContacts: newContacts });
    clearFieldError?.("emergencyContacts");
  };

  const addContact = () => {
    const newContacts = [...contacts, { name: "", phone: "", relationship: "" }];
    setContacts(newContacts);
    updateData({ emergencyContacts: newContacts });
  };

  const removeContact = (index: number) => {
    if (contacts.length <= 1) return;
    const newContacts = contacts.filter((_, i) => i !== index);
    setContacts(newContacts);
    updateData({ emergencyContacts: newContacts });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Liên hệ khẩn cấp</h2>
        <p className="text-muted-foreground">
          Thêm người liên hệ khi cần thiết
        </p>
      </div>

      {fieldErrors.emergencyContacts && (
        <p className="text-sm text-destructive" role="alert">
          {fieldErrors.emergencyContacts}
        </p>
      )}

      <div className="space-y-4">
        {contacts.map((contact, index) => (
          <div key={index} className="rounded-lg border p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Liên hệ {index + 1}</span>
              {contacts.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeContact(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Name */}
              <div className="space-y-1">
                <Label htmlFor={`contact-${index}-name`}>
                  Tên <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`contact-${index}-name`}
                  placeholder="Nguyễn Thị B"
                  value={contact.name}
                  onChange={(e) => updateContact(index, "name", e.target.value)}
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <Label htmlFor={`contact-${index}-phone`}>
                  SĐT <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`contact-${index}-phone`}
                  type="tel"
                  placeholder="+84 987 654 321"
                  value={contact.phone}
                  onChange={(e) => updateContact(index, "phone", e.target.value)}
                />
              </div>

              {/* Relationship */}
              <div className="space-y-1">
                <Label htmlFor={`contact-${index}-relationship`}>
                  Quan hệ <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={contact.relationship}
                  onValueChange={(value) => updateContact(index, "relationship", value)}
                >
                  <SelectTrigger id={`contact-${index}-relationship`}>
                    <SelectValue placeholder="Chọn quan hệ" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIPS.map((rel) => (
                      <SelectItem key={rel} value={rel}>
                        {rel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Email (optional) */}
              <div className="space-y-1">
                <Label htmlFor={`contact-${index}-email`}>Email (tùy chọn)</Label>
                <Input
                  id={`contact-${index}-email`}
                  type="email"
                  placeholder="email@example.com"
                  value={contact.email || ""}
                  onChange={(e) => updateContact(index, "email", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Contact Button */}
      <Button variant="outline" onClick={addContact} className="w-full">
        <Plus className="size-4 mr-2" />
        Thêm liên hệ
      </Button>
    </div>
  );
}
