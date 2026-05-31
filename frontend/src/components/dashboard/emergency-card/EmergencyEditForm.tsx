/**
 * EmergencyEditForm — controlled inputs for the dashboard's edit panel.
 *
 * F1 — the draft state lives in the parent (`EmergencyCardManager`) so the
 * preview and the form share a single source of truth. Every input writes
 * back via the `onDraftChange` callback; the preview re-renders immediately
 * with no roundtrip.
 *
 * Save reconciles the draft to the server via PATCH; on success the parent
 * triggers `router.refresh()` to pick up server-derived fields the client
 * cannot synthesize (e.g., revealing previously-hidden fields).
 */
"use client";

import { Loader2, RotateCcw, Save } from "lucide-react";
import * as React from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ASSISTANCE_NEEDS,
  EMERGENCY_CARD_FIELDS,
  type AssistanceNeed,
  type EmergencyCardField,
  type EmergencyEditDraft,
} from "@/lib/emergency-card-types";
import { cn } from "@/lib/utils";

interface EmergencyEditFormProps {
  draft: EmergencyEditDraft;
  onDraftChange: (next: EmergencyEditDraft) => void;
  isDirty: boolean;
  isSaving: boolean;
  saved: boolean;
  onSave: () => void;
  onReset: () => void;
}

export function EmergencyEditForm({
  draft,
  onDraftChange,
  isDirty,
  isSaving,
  saved,
  onSave,
  onReset,
}: EmergencyEditFormProps) {
  const t = useTranslations("dashboard.emergencyCard.edit");
  const tField = useTranslations("dashboard.emergencyCard.fields");

  function patch<K extends keyof EmergencyEditDraft>(key: K, value: EmergencyEditDraft[K]) {
    onDraftChange({ ...draft, [key]: value });
  }

  function isVisible(field: EmergencyCardField): boolean {
    return draft.field_visibility[field] !== false;
  }

  function toggleVisibility(field: EmergencyCardField) {
    onDraftChange({
      ...draft,
      field_visibility: {
        ...draft.field_visibility,
        [field]: draft.field_visibility[field] === false ? true : false,
      },
    });
  }

  function toggleAssistance(value: AssistanceNeed) {
    const next = draft.assistance_needed.includes(value)
      ? draft.assistance_needed.filter((p) => p !== value)
      : [...draft.assistance_needed, value];
    patch("assistance_needed", next);
  }

  return (
    // oxlint-disable-next-line react-doctor/no-prevent-default -- Emergency card draft is client-side state saved by the parent dialog.
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      noValidate
    >
      {/* NKDA */}
      <Section title={t("allergiesTitle")}>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            id="ec-nkda"
            checked={draft.nkda_confirmed}
            onCheckedChange={(c) => patch("nkda_confirmed", !!c)}
          />
          <span>
            <span className="block font-medium">{t("nkdaTitle")}</span>
            <span className="block text-xs text-muted-foreground">{t("nkdaDesc")}</span>
          </span>
        </label>
      </Section>

      {/* Assistance needed */}
      <Section title={t("assistanceTitle")} description={t("assistanceDesc")}>
        <div className="flex flex-wrap gap-1.5">
          {ASSISTANCE_NEEDS.map((value) => {
            const active = draft.assistance_needed.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleAssistance(value)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted"
                )}
              >
                {t(`assistance.${value}` as Parameters<typeof t>[0])}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Equipment & communication */}
      <Section title={t("equipmentTitle")} description={t("equipmentDesc")}>
        <Textarea
          value={draft.equipment_notes ?? ""}
          onChange={(e) => patch("equipment_notes", e.target.value || null)}
          placeholder={t("equipmentPlaceholder")}
          rows={2}
          maxLength={500}
          className="resize-none"
        />
      </Section>

      <Section title={t("communicationTitle")} description={t("communicationDesc")}>
        <Textarea
          value={draft.communication_notes ?? ""}
          onChange={(e) => patch("communication_notes", e.target.value || null)}
          placeholder={t("communicationPlaceholder")}
          rows={2}
          maxLength={500}
          className="resize-none"
        />
      </Section>

      <Section title={t("languageTitle")} description={t("languageDesc")}>
        <Input
          value={draft.preferred_language ?? ""}
          onChange={(e) => patch("preferred_language", e.target.value || null)}
          placeholder="vi / en / fr"
          maxLength={8}
          className="max-w-[100px]"
        />
      </Section>

      {/* Field visibility */}
      <Section
        title={t("visibilityTitle")}
        description={t("visibilityDesc")}
      >
        <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
          {EMERGENCY_CARD_FIELDS.map((field) => (
            <div
              key={field}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <Label htmlFor={`vis-${field}`} className="cursor-pointer font-normal">
                {tField(field as Parameters<typeof tField>[0])}
              </Label>
              <Switch
                id={`vis-${field}`}
                checked={isVisible(field)}
                onCheckedChange={() => toggleVisibility(field)}
                aria-label={`${tField(field as Parameters<typeof tField>[0])} visibility`}
              />
            </div>
          ))}
        </div>
      </Section>

      <div className="sticky bottom-2 flex items-center justify-end gap-2 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
        {saved && !isDirty && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            {t("saved")}
          </span>
        )}
        {isDirty && !isSaving && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="gap-1.5"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            {t("reset")}
          </Button>
        )}
        <Button type="submit" disabled={isSaving || !isDirty} className="gap-2">
          {isSaving ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Save className="size-3.5" aria-hidden />
          )}
          {isSaving ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
