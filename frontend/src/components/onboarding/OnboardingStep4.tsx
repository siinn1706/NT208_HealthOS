"use client";

import { useTranslations } from "next-intl";
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

const RELATIONSHIP_KEYS = [
  "spouse",
  "parent",
  "sibling",
  "child",
  "friend",
  "coworker",
  "other",
] as const;

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
  const t = useTranslations("onboarding.step4");

  const contacts: EmergencyContactForm[] =
    data.emergencyContacts && data.emergencyContacts.length > 0
      ? data.emergencyContacts
      : [{ name: "", phone: "", relationship: "" }];

  const commit = (next: EmergencyContactForm[]) => {
    updateData({ emergencyContacts: next });
    clearFieldError?.("emergencyContacts");
  };

  const updateContact = (
    index: number,
    field: keyof EmergencyContactForm,
    value: string,
  ) => {
    const next = contacts.map((c, i) => (i === index ? { ...c, [field]: value } : c));
    commit(next);
  };

  const addContact = () => {
    commit([...contacts, { name: "", phone: "", relationship: "" }]);
  };

  const removeContact = (index: number) => {
    if (contacts.length <= 1) return;
    commit(contacts.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-foreground">{t("title")}</h2>
        <p className="text-muted-foreground">{t("subtitle")}</p>
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
              <span className="text-sm font-medium">
                {t("contactLabel", { n: index + 1 })}
              </span>
              {contacts.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeContact(index)}
                  aria-label={t("removeContact")}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor={`contact-${index}-name`}>
                  {t("name")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`contact-${index}-name`}
                  placeholder={t("namePlaceholder")}
                  value={contact.name}
                  onChange={(e) => updateContact(index, "name", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor={`contact-${index}-phone`}>
                  {t("phone")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`contact-${index}-phone`}
                  type="tel"
                  placeholder={t("phonePlaceholder")}
                  value={contact.phone}
                  onChange={(e) => updateContact(index, "phone", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor={`contact-${index}-relationship`}>
                  {t("relationship")} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={contact.relationship}
                  onValueChange={(value) => updateContact(index, "relationship", value)}
                >
                  <SelectTrigger id={`contact-${index}-relationship`}>
                    <SelectValue placeholder={t("selectRelationship")} />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_KEYS.map((key) => (
                      <SelectItem key={key} value={key}>
                        {t(`relationships.${key}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor={`contact-${index}-email`}>{t("emailOptional")}</Label>
                <Input
                  id={`contact-${index}-email`}
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={contact.email || ""}
                  onChange={(e) => updateContact(index, "email", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={addContact} className="w-full">
        <Plus className="size-4 mr-2" />
        {t("addContact")}
      </Button>
    </div>
  );
}
