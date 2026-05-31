"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Phone, Lock } from "lucide-react";

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProfileSection } from "./ProfileSection";
import type { ProfileFormValues } from "@/lib/validators/profile-schema";
import type { UserProfile } from "@/types/api";

interface ContactSectionProps {
  isEditing: boolean;
  email: UserProfile["email"];
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

export function ContactSection({ isEditing, email }: ContactSectionProps) {
  const t = useTranslations("dashboard.profile");
  const form = useFormContext<ProfileFormValues>();
  const values = form.getValues();

  if (!isEditing) {
    return (
      <ProfileSection icon={Phone} title={t("sections.contact")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadOnlyRow label={t("fields.phone")} value={values.phone ?? null} />
          <ReadOnlyRow label={t("fields.email")} value={email} />
          <div className="sm:col-span-2">
            <ReadOnlyRow label={t("fields.address")} value={values.address ?? null} />
          </div>
        </div>
      </ProfileSection>
    );
  }

  return (
    <ProfileSection icon={Phone} title={t("sections.contact")}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Phone */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.phone")}</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="0901234567"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value || null)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email — always read-only */}
        <FormItem>
          <FormLabel className="flex items-center gap-1.5">
            {t("fields.email")}
            <Tooltip>
              <TooltipTrigger asChild>
                <Lock className="size-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{t("emailReadOnly")}</p>
              </TooltipContent>
            </Tooltip>
          </FormLabel>
          <Input value={email} disabled className="opacity-60 cursor-not-allowed" />
        </FormItem>

        {/* Address */}
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>{t("fields.address")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("placeholders.address")}
                  className="resize-none"
                  rows={2}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value || null)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </ProfileSection>
  );
}
