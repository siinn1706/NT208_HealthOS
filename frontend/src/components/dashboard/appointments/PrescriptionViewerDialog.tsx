"use client";

import { Pill, Stethoscope, CalendarDays, Building2, FileText } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Prescription } from "@/types/api";

/**
 * Prescription viewer (UX plan §F).
 *
 * Previously this was a hand-rolled overlay using a fixed-position div with
 * an `onClick` backdrop close. That implementation skipped focus trap, ESC
 * dismissal, and body scroll-lock — it also rendered outside the React tree
 * portal, so other modals (toasts, popovers) could obscure it. We now wrap
 * shadcn's `<Dialog>` (Radix under the hood) which gives us all of that
 * accessibility plumbing for free.
 */

interface PrescriptionViewerDialogProps {
  prescription: Prescription | null;
  onClose: () => void;
}

// Note: dosage chip currently uses the `default` colour for every entry; the
// language-specific category map below is kept for reference but is no longer
// keyed off Vietnamese strings (so an English-locale prescription doesn't fall
// to a different colour by accident).
const CATEGORY_COLORS = {
  default: "var(--color-warm-gold)",
} as const;

export function PrescriptionViewerDialog({
  prescription,
  onClose,
}: PrescriptionViewerDialogProps) {
  const t = useTranslations("dashboard.appointments");
  const locale = useLocale();

  const open = prescription !== null;

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-lg p-0 gap-0 overflow-hidden max-h-[92dvh] grid-rows-[auto_1fr_auto]"
        showCloseButton
      >
        {!prescription ? null : (
          <>
            <DialogHeader className="flex-row items-start gap-3 px-5 py-4 border-b border-border bg-muted/30 text-left space-y-0">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"
                aria-hidden
              >
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-sm font-semibold text-foreground">
                  {t("prescriptionAria", { name: prescription.doctor })}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {prescription.diagnosis}
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="overflow-y-auto px-5 py-4 space-y-4">
              <PrescriptionMeta prescription={prescription} locale={locale} t={t} />

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Pill className="w-4 h-4 text-muted-foreground" aria-hidden />
                  <p className="text-sm font-semibold text-foreground">
                    {t("medicineList", { count: prescription.medicines.length })}
                  </p>
                </div>
                <ul className="space-y-3">
                  {prescription.medicines.map((med, i) => (
                    <li
                      key={i}
                      className="rounded-xl border border-border bg-background p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground leading-snug">
                          {med.name}
                        </p>
                        <span
                          className="flex-shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                          style={{
                            background: `${CATEGORY_COLORS.default}20`,
                            color: CATEGORY_COLORS.default,
                          }}
                        >
                          {med.dosage}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">{t("frequency")}: </span>
                          <span className="text-foreground font-medium">{med.frequency}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t("duration")}: </span>
                          <span className="text-foreground font-medium">{med.duration}</span>
                        </div>
                      </div>
                      {med.notes && (
                        <p className="text-[11px] text-muted-foreground italic border-t border-border pt-2">
                          {med.notes}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {prescription.notes && (
                <div className="rounded-xl border border-warm-gold/40 bg-warm-gold/10 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-warm-gold mb-1">
                    {t("doctorNotes")}
                  </p>
                  <p className="text-xs text-foreground leading-relaxed">
                    {prescription.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-border bg-muted/20">
              <p className="text-[10px] text-muted-foreground text-center leading-snug">
                {t("prescriptionDisclaimer")}
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PrescriptionMeta({
  prescription,
  locale,
  t,
}: {
  prescription: Prescription;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const issued = new Date(prescription.issuedAt);
  const dateStr = Number.isNaN(issued.getTime())
    ? "--"
    : issued.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

  const items = [
    { icon: Stethoscope, label: t("doctor"), value: prescription.doctor },
    { icon: Building2, label: t("facility"), value: prescription.clinic },
    { icon: CalendarDays, label: t("prescriptionDate"), value: dateStr },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="rounded-xl border border-border bg-background p-3 flex items-start gap-2.5"
        >
          <Icon
            className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="text-xs font-medium text-foreground mt-0.5 truncate">
              {value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
