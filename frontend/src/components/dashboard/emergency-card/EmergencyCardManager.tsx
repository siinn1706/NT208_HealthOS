/**
 * EmergencyCardManager — owner-side dashboard wrapper.
 *
 * Two-column on desktop (preview left, manage right), stacked on mobile.
 * The right pane is tabbed (Edit / QR codes / Access log). The "Publish"
 * master switch sits above the preview so the owner sees the dimmed
 * preview when their card is private.
 *
 * F1 — owns the editable draft state. The preview re-renders live as the
 * owner toggles visibility / NKDA / equipment notes / etc.; Save reconciles
 * the draft to the server.
 *
 * F2 — wraps the master switch, missing-data banner, and tabbed manage pane
 * in `ec-print-hide` so `window.print()` produces a clean wallet card.
 */
"use client";

import {
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Printer,
  QrCode,
  ScrollText,
} from "lucide-react";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-utils";
import {
  applyDraftToCard,
  draftFromView,
  type EmergencyAccessLog,
  type EmergencyEditDraft,
  type EmergencyProfileOwnerView,
} from "@/lib/emergency-card-types";

import { EmergencyAccessLogTable } from "./EmergencyAccessLogTable";
import { EmergencyCardView } from "./EmergencyCardView";
import { EmergencyEditForm } from "./EmergencyEditForm";
import { EmergencyTokenManager } from "./EmergencyTokenManager";
import { MissingDataBanner } from "./MissingDataBanner";

interface EmergencyCardManagerProps {
  view: EmergencyProfileOwnerView;
  initialLogs: EmergencyAccessLog[];
}

/** Stable shallow comparison for the small set of fields in a draft. */
function draftsEqual(a: EmergencyEditDraft, b: EmergencyEditDraft): boolean {
  if (a.nkda_confirmed !== b.nkda_confirmed) return false;
  if ((a.equipment_notes ?? "") !== (b.equipment_notes ?? "")) return false;
  if ((a.communication_notes ?? "") !== (b.communication_notes ?? "")) return false;
  if ((a.preferred_language ?? "") !== (b.preferred_language ?? "")) return false;
  if (a.assistance_needed.length !== b.assistance_needed.length) return false;
  const aSet = new Set(a.assistance_needed);
  for (const v of b.assistance_needed) if (!aSet.has(v)) return false;
  const keys = new Set([
    ...Object.keys(a.field_visibility),
    ...Object.keys(b.field_visibility),
  ]);
  for (const k of keys) {
    const aVal = a.field_visibility[k as keyof typeof a.field_visibility] ?? true;
    const bVal = b.field_visibility[k as keyof typeof b.field_visibility] ?? true;
    if (aVal !== bVal) return false;
  }
  return true;
}

export function EmergencyCardManager({ view, initialLogs }: EmergencyCardManagerProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("dashboard.emergencyCard");
  const [togglingPublish, setTogglingPublish] = React.useState(false);

  // F1 — single source of truth for the editable overrides. Re-syncs from
  // the server-derived view whenever the parent passes a fresh `view`
  // (e.g., after a successful save triggers `router.refresh()`).
  const serverDraft = React.useMemo(() => draftFromView(view), [view]);
  const [draft, setDraft] = React.useState<EmergencyEditDraft>(serverDraft);
  React.useEffect(() => {
    setDraft(serverDraft);
  }, [serverDraft]);

  const [isSaving, setIsSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const isDirty = !draftsEqual(draft, serverDraft);
  const previewCard = React.useMemo(
    () => applyDraftToCard(view.card, draft),
    [view.card, draft]
  );

  const provenance = view.last_published_at
    ? t("provenance.publishedAt", { date: formatDate(view.last_published_at, locale) })
    : null;

  async function togglePublish(next: boolean) {
    setTogglingPublish(true);
    try {
      const res = await fetch("/api/v1/users/me/emergency-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: next }),
      });
      if (!res.ok) throw new Error("toggle-failed");
      toast.success(next ? t("publishedToast") : t("unpublishedToast"));
      router.refresh();
    } catch {
      toast.error(t("togglePublishFailed"));
    } finally {
      setTogglingPublish(false);
    }
  }

  async function saveDraft() {
    setIsSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/v1/users/me/emergency-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistance_needed: draft.assistance_needed,
          equipment_notes: draft.equipment_notes,
          communication_notes: draft.communication_notes,
          nkda_confirmed: draft.nkda_confirmed,
          preferred_language: draft.preferred_language,
          field_visibility: draft.field_visibility,
        }),
      });
      if (!res.ok) throw new Error("save-failed");
      setSaved(true);
      toast.success(t("edit.saved"));
      router.refresh();
      window.setTimeout(() => setSaved(false), 2500);
    } catch {
      toast.error(t("edit.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  return (
    <div className="space-y-5">
      {/* Master publish switch — F2 hidden on print */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3.5 ec-print-hide",
          view.is_published ? "border-emerald-300" : "border-amber-300"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-lg",
              view.is_published
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
            )}
          >
            {view.is_published ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {view.is_published ? t("publishedTitle") : t("unpublishedTitle")}
            </p>
            <p className="text-xs text-muted-foreground">
              {view.is_published
                ? t("publishedSubtitle", { count: view.active_token_count })
                : t("unpublishedSubtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {togglingPublish && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden />
          )}
          <Switch
            checked={view.is_published}
            onCheckedChange={togglePublish}
            disabled={togglingPublish}
            aria-label={t("publishSwitch")}
          />
        </div>
      </div>

      {/* Completeness nudges — F2 hidden on print */}
      <div className="ec-print-hide">
        <MissingDataBanner
          nudges={view.nudges}
          completenessScore={view.completeness_score}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,_1fr)_minmax(0,_1.1fr)]">
        {/* Preview pane */}
        <div className="space-y-2">
          <div className="flex items-center justify-between ec-print-hide">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isDirty ? t("previewTitleDraft") : t("previewTitle")}
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handlePrint}
              className="gap-1.5"
            >
              <Printer className="size-3.5" aria-hidden />
              {t("print")}
            </Button>
          </div>
          <div
            className={cn(
              !view.is_published && "opacity-60 [&_*]:!cursor-default",
              "transition-opacity"
            )}
          >
            <EmergencyCardView
              card={previewCard}
              locale={locale}
              enablePrintLayout
              provenanceLine={provenance}
            />
          </div>
          {!view.is_published && (
            <p className="text-center text-xs text-muted-foreground ec-print-hide">
              {t("previewMutedNote")}
            </p>
          )}
        </div>

        {/* Manage pane (tabs) — F2 hidden on print */}
        <div className="ec-print-hide">
          <Tabs defaultValue="qr" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="qr" className="gap-1.5">
                <QrCode className="size-3.5" aria-hidden />
                {t("tabs.qr")}
              </TabsTrigger>
              <TabsTrigger value="edit" className="gap-1.5">
                <Pencil className="size-3.5" aria-hidden />
                {t("tabs.edit")}
                {isDirty && (
                  <span
                    className="ml-1 size-1.5 rounded-full bg-amber-500"
                    aria-label={t("tabs.editDirtyAria")}
                  />
                )}
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-1.5">
                <ScrollText className="size-3.5" aria-hidden />
                {t("tabs.logs")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="qr" className="space-y-4">
              <EmergencyTokenManager
                tokens={view.tokens}
                activeCount={view.active_token_count}
                maxActive={view.max_active_tokens}
                isPublished={view.is_published}
                completenessScore={view.completeness_score}
                missingCriticalFields={view.missing_critical_fields}
                /* U4 — feed the live preview card into the mint dialog */
                /* so the consent dialog shows actual values that will be */
                /* exposed (and respects unsaved visibility edits). */
                cardPreview={{
                  full_name: previewCard.full_name,
                  blood_type: previewCard.blood_type,
                  allergies: previewCard.allergies,
                  medications: previewCard.medications,
                  contactCount: previewCard.emergency_contacts.length,
                }}
              />
            </TabsContent>

            <TabsContent value="edit" className="space-y-4">
              <EmergencyEditForm
                draft={draft}
                onDraftChange={setDraft}
                isDirty={isDirty}
                isSaving={isSaving}
                saved={saved}
                onSave={saveDraft}
                onReset={() => setDraft(serverDraft)}
              />
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <EmergencyAccessLogTable initialLogs={initialLogs} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
