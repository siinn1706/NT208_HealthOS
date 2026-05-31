"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, HeartPulse, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProfileSection } from "./ProfileSection";
import type { ProfileFormValues } from "@/lib/validators/profile-schema";

const RELATIONSHIPS = [
  "parent",
  "spouse",
  "sibling",
  "child",
  "friend",
  "other",
] as const;

const RELATIONSHIP_LABEL_MAP: Record<string, (typeof RELATIONSHIPS)[number]> = {
  // canonical keys
  parent: "parent",
  spouse: "spouse",
  sibling: "sibling",
  child: "child",
  friend: "friend",
  other: "other",

  // localized legacy values (vi)
  "cha/mẹ": "parent",
  "vợ/chồng": "spouse",
  "anh/chị/em": "sibling",
  con: "child",
  "bạn bè": "friend",
  khác: "other",
};

function normalizeRelationship(
  relationship: string | null | undefined
): (typeof RELATIONSHIPS)[number] | null {
  if (!relationship) return null;
  const key = relationship.trim().toLowerCase();
  return RELATIONSHIP_LABEL_MAP[key] ?? null;
}

const MAX_CONTACTS = 5;

interface EmergencyContactSectionProps {
  isEditing: boolean;
}

function ReadOnlyRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">
        {value ?? <span className="italic text-muted-foreground/60">N/A</span>}
      </p>
    </div>
  );
}

export function EmergencyContactSection({
  isEditing,
}: EmergencyContactSectionProps) {
  const t = useTranslations("dashboard.profile");
  const locale = useLocale();
  const form = useFormContext<ProfileFormValues>();

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "emergency_contacts",
  });

  const emergencyCardLink = (
    <Link
      href={`/${locale}/dashboard/emergency-card`}
      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <HeartPulse className="size-3" aria-hidden />
      {t("manageEmergencyCard")}
    </Link>
  );

  // ── View mode ──────────────────────────────────────────────────────────────
  if (!isEditing) {
    const contacts = form.getValues("emergency_contacts");

    if (!contacts || contacts.length === 0) {
      return (
        <ProfileSection icon={AlertCircle} title={t("sections.emergency")}>
          <p className="text-sm italic text-muted-foreground/60">
            {t("noContacts")}
          </p>
          {emergencyCardLink}
        </ProfileSection>
      );
    }

    return (
      <ProfileSection icon={AlertCircle} title={t("sections.emergency")}>
        <div className="space-y-5">
          {contacts.map((contact, index) => {
            const rel = contact.relationship?.trim() ?? null;
            const relKey = normalizeRelationship(rel);
            const relLabel = relKey
              ? t(`relationships.${relKey}` as Parameters<typeof t>[0])
              : rel;
            return (
              <div key={`${contact.name ?? ""}-${contact.phone ?? ""}-${contact.relationship ?? ""}`}>
                {index > 0 && <Separator className="mb-5" />}
                <p className="mb-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("contactN", { n: index + 1 })}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <ReadOnlyRow
                    label={t("fields.emergencyName")}
                    value={contact.name ?? null}
                  />
                  <ReadOnlyRow
                    label={t("fields.emergencyRelationship")}
                    value={relLabel}
                  />
                  <ReadOnlyRow
                    label={t("fields.emergencyPhone")}
                    value={contact.phone ?? null}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {emergencyCardLink}
      </ProfileSection>
    );
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────
  return (
    <ProfileSection icon={AlertCircle} title={t("sections.emergency")}>
      <div className="space-y-5">
        {fields.length === 0 && (
          <p className="text-sm italic text-muted-foreground/60">
            {t("noContacts")}
          </p>
        )}

        {fields.map((field, index) => (
          <div key={field.id}>
            {index > 0 && <Separator className="mb-5" />}

            {/* Row header: label + remove button */}
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("contactN", { n: index + 1 })}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
                className="h-7 gap-1 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label={t("removeContact")}
              >
                <Trash2 className="size-3.5" />
                {t("removeContact")}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Contact Name */}
              <FormField
                control={form.control}
                name={`emergency_contacts.${index}.name`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>{t("fields.emergencyName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("placeholders.emergencyName")}
                        {...f}
                        value={f.value ?? ""}
                        onChange={(e) => f.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Relationship */}
              <FormField
                control={form.control}
                name={`emergency_contacts.${index}.relationship`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>{t("fields.emergencyRelationship")}</FormLabel>
                    <Select
                      value={f.value ?? ""}
                      onValueChange={(v) => f.onChange(v)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("placeholders.select")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RELATIONSHIPS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {t(`relationships.${r}` as Parameters<typeof t>[0])}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone */}
              <FormField
                control={form.control}
                name={`emergency_contacts.${index}.phone`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>{t("fields.emergencyPhone")}</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="0912345678"
                        {...f}
                        value={f.value ?? ""}
                        onChange={(e) => f.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        ))}

        {/* Add contact button */}
        {fields.length < MAX_CONTACTS && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ name: "", relationship: "", phone: "" })
            }
            className="mt-1 gap-1.5"
          >
            <Plus className="size-3.5" />
            {t("addContact")}
          </Button>
        )}
      </div>
    </ProfileSection>
  );
}
