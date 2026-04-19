/**
 * EmergencyMintDialog — explicit-consent flow for issuing a new QR token.
 *
 * Steps in the dialog body:
 *   1. Owner names the card ("Wallet card 1" by default).
 *   2. Acknowledge checkbox — restates exactly what is exposed.
 *   3. Optional override for low-completeness profiles (the BE refuses the
 *      mint with `INSUFFICIENT_PROFILE` unless we forward the ack).
 *
 * The dialog does NOT keep the plaintext token in state after a successful
 * mint — it hands the result to the parent and resets so the secret never
 * lives longer than necessary.
 */
"use client";

import { Loader2, ShieldAlert, Sparkles } from "lucide-react";
import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EmergencyShareTokenWithSecret } from "@/lib/emergency-card-types";

interface EmergencyMintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  completenessScore: number;
  /** M6 — surfaced inside the low-completeness override warning. */
  missingCriticalFields: string[];
  /** U4 — personalized preview of what will be exposed. Optional so the
   * dialog still works in isolation (e.g. unit tests). */
  cardPreview?: {
    full_name?: string | null;
    blood_type?: string | null;
    allergies?: string[];
    medications?: { name: string; strength?: string | null }[];
    contactCount?: number;
  };
  onMinted: (payload: EmergencyShareTokenWithSecret) => void;
}

const PUBLISH_THRESHOLD = 30;

export function EmergencyMintDialog({
  open,
  onOpenChange,
  completenessScore,
  missingCriticalFields,
  cardPreview,
  onMinted,
}: EmergencyMintDialogProps) {
  const t = useTranslations("dashboard.emergencyCard.mint");
  const tField = useTranslations("dashboard.emergencyCard.fields");
  const [label, setLabel] = React.useState("");
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [ackLowCompleteness, setAckLowCompleteness] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const lowCompleteness = completenessScore < PUBLISH_THRESHOLD;

  React.useEffect(() => {
    if (open) {
      // Reset every open so a previous mint can't pollute the next one.
      setLabel(t("defaultLabel"));
      setAcknowledged(false);
      setAckLowCompleteness(false);
    }
  }, [open, t]);

  async function handleMint() {
    if (!label.trim()) {
      toast.error(t("labelRequired"));
      return;
    }
    if (!acknowledged) {
      toast.error(t("ackRequired"));
      return;
    }
    if (lowCompleteness && !ackLowCompleteness) {
      toast.error(t("ackLowCompletenessRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        "/api/v1/users/me/emergency-profile/tokens",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: label.trim(),
            acknowledge_low_completeness: ackLowCompleteness,
          }),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const code = json?.error?.code;
        if (code === "TOO_MANY_ACTIVE_TOKENS") toast.error(t("tooMany"));
        else if (code === "CARD_NOT_PUBLISHED") toast.error(t("notPublished"));
        else if (code === "INSUFFICIENT_PROFILE") toast.error(t("insufficient"));
        else toast.error(t("mintFailed"));
        return;
      }
      const json = await res.json().catch(() => null);
      const payload = json?.data as EmergencyShareTokenWithSecret | undefined;
      if (!payload?.token || !payload?.share_url || !payload?.qr_png_data_url) {
        toast.error(t("mintFailed"));
        return;
      }
      onMinted(payload);
    } catch {
      toast.error(t("mintFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="ec-mint-label" className="text-sm">
              {t("labelInput")}
            </Label>
            <Input
              id="ec-mint-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("labelPlaceholder")}
              maxLength={64}
              autoFocus
            />
          </div>

          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
            <p className="font-semibold">{t("exposedTitle")}</p>
            {/* U4 — personalize the exposed-data preview when the parent */}
            {/* passes the current card. Falls back to the static bullets */}
            {/* (e.g., unit tests, first-visit before card is loaded). */}
            {cardPreview ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {cardPreview.full_name && (
                  <li>{t("exposedNamePersonalized", { name: cardPreview.full_name })}</li>
                )}
                {cardPreview.blood_type && (
                  <li>{t("exposedBloodPersonalized", { blood: cardPreview.blood_type })}</li>
                )}
                {cardPreview.allergies && cardPreview.allergies.length > 0 && (
                  <li>
                    {t("exposedAllergiesPersonalized", {
                      list: cardPreview.allergies.slice(0, 3).join(", "),
                      more: cardPreview.allergies.length > 3
                        ? ` (+${cardPreview.allergies.length - 3})`
                        : "",
                    })}
                  </li>
                )}
                {cardPreview.medications && cardPreview.medications.length > 0 && (
                  <li>
                    {t("exposedMedsPersonalized", {
                      count: cardPreview.medications.length,
                    })}
                  </li>
                )}
                {typeof cardPreview.contactCount === "number" && cardPreview.contactCount > 0 && (
                  <li>
                    {t("exposedContactsPersonalized", { count: cardPreview.contactCount })}
                  </li>
                )}
              </ul>
            ) : (
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                <li>{t("exposed1")}</li>
                <li>{t("exposed2")}</li>
                <li>{t("exposed3")}</li>
                <li>{t("exposed4")}</li>
              </ul>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              id="ec-ack"
              checked={acknowledged}
              onCheckedChange={(c) => setAcknowledged(!!c)}
            />
            <span className="leading-snug">{t("acknowledge")}</span>
          </label>

          {lowCompleteness && (
            <label className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-900 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
              <Checkbox
                id="ec-ack-low"
                checked={ackLowCompleteness}
                onCheckedChange={(c) => setAckLowCompleteness(!!c)}
              />
              <span className="leading-snug">
                <span className="flex items-center gap-1 font-semibold">
                  <ShieldAlert className="size-3" aria-hidden />
                  {t("lowCompletenessTitle", { score: completenessScore })}
                </span>
                {/* M6 — surface which critical fields are missing so the */}
                {/* owner doesn't have to leave the dialog to find out. */}
                {missingCriticalFields.length > 0 && (
                  <ul className="mt-1 list-disc pl-4">
                    {missingCriticalFields.map((field) => {
                      // Map the BE field key to a translated card label
                      // when one exists; fall back to the raw key for
                      // forward-compat with new field names.
                      const labelKey = field === "emergency_contacts"
                        ? "contacts"
                        : field === "chronic_conditions"
                          ? "conditions"
                          : field === "current_medications"
                            ? "medications"
                            : field;
                      let label = field;
                      try {
                        label = tField(labelKey as Parameters<typeof tField>[0]);
                      } catch {
                        // Unknown key — leave as-is.
                      }
                      return <li key={field}>{label}</li>;
                    })}
                  </ul>
                )}
                <span className="mt-0.5 block">{t("lowCompletenessBody")}</span>
              </span>
            </label>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleMint}
            disabled={submitting || !acknowledged || (lowCompleteness && !ackLowCompleteness)}
            className="gap-2"
          >
            {submitting ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-3.5" aria-hidden />
            )}
            {submitting ? t("minting") : t("mint")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
