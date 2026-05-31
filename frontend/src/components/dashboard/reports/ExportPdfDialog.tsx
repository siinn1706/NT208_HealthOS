"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Download, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { HealthReport } from "@/types/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/**
 * B7 P10 — Real PDF export pipeline.
 *
 * Replaces the previous `window.print()` HTML hack with a server-rendered
 * WeasyPrint job:
 *   1. POST /api/v1/reports/export-pdf  → 202 + job_id
 *   2. The Celery worker renders the PDF, uploads it to MinIO, and inserts
 *      a "Report ready" notification — the user is free to navigate away.
 *   3. Clicking the notification (or returning to /dashboard/reports?pdf=…)
 *      hits GET /export-pdf/{id}/download which returns a fresh 5-min
 *      signed URL; the browser opens it in a new tab and downloads the PDF.
 *
 * The PHI warning + per-section toggles + sensitive-default-off are kept
 * on the dialog itself so the user explicitly opts in before submitting.
 */

async function submitPdfExportJob(params: {
  period: string;
  sections: string[];
  locale: string;
  includeSensitive: boolean;
}): Promise<{ jobId: string } | { error: string }> {
  try {
    const res = await fetch("/api/v1/reports/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        period: params.period,
        sections: params.sections,
        locale: params.locale.startsWith("vi") ? "vi" : "en",
        include_sensitive: params.includeSensitive,
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      return { error: json?.error?.message ?? "request-failed" };
    }
    const json = await res.json().catch(() => null);
    const jobId: string | undefined = json?.data?.id;
    if (!jobId) return { error: "missing-id" };
    return { jobId };
  } catch {
    return { error: "network" };
  }
}

// ─── Dialog Component ─────────────────────────────────────────────────────────

interface ExportPdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: HealthReport;
}

// B7 review P1-8 — sensitive section keys mirror the BE template's
// `i18n.sensitive_categories` list. Toggling `includeSensitive` is the only
// way these get rendered; section checkboxes alone don't bypass the gate.
const SENSITIVE_SECTION_KEYS: ReadonlySet<string> = new Set(["medication"]);

export function ExportPdfDialog({ open, onOpenChange, report }: ExportPdfDialogProps) {
  const t = useTranslations("reports");
  const tCat = useTranslations("reports.categories");
  const tExp = useTranslations("reports.export");
  const locale = useLocale();
  const [generating, setGenerating] = useState(false);
  // B7 review P1-8 — explicit opt-in for sensitive sections (defaults off).
  // The dead `includeDataTable` / `includeAiInsights` checkboxes that the
  // server ignored have been removed.
  const [includeSensitive, setIncludeSensitive] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>(() =>
    report.sections.map((s) => s.category)
  );

  function toggleSection(cat: string) {
    setSelectedSections((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function handleExport() {
    if (selectedSections.length === 0) {
      toast.error(tExp("selectAtLeastOne"));
      return;
    }
    // If the user picked sensitive sections without enabling the toggle,
    // be explicit instead of silently dropping them on the server.
    const sensitiveSelected = selectedSections.some((s) => SENSITIVE_SECTION_KEYS.has(s));
    if (sensitiveSelected && !includeSensitive) {
      toast.error(tExp("sensitiveBlocked"));
      return;
    }
    setGenerating(true);
    const result = await submitPdfExportJob({
      period: report.period,
      sections: selectedSections,
      locale,
      includeSensitive,
    });
    setGenerating(false);
    if ("error" in result) {
      toast.error(tExp("errorGeneric"));
      return;
    }
    // Server-rendered: the user is notified when the PDF is ready.
    toast.success(t("exportPdfSuccess"));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="size-4" aria-hidden />
            {t("exportPdf")}
          </DialogTitle>
          <DialogDescription>{tExp("dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* PII warning */}
          <div
            role="note"
            className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-warning"
          >
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="space-y-1">
              <p className="text-xs font-semibold">{tExp("piiTitle")}</p>
              <p className="text-[11px] leading-relaxed text-warning/90">{tExp("piiBody")}</p>
            </div>
          </div>

          {/* Section selector */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">{tExp("sections")}</p>
            <div className="space-y-2">
              {report.sections.map((s) => (
                <div key={s.category} className="flex items-center gap-2">
                  <Checkbox
                    id={`section-${s.category}`}
                    checked={selectedSections.includes(s.category)}
                    onCheckedChange={() => toggleSection(s.category)}
                  />
                  <Label htmlFor={`section-${s.category}`} className="text-sm font-normal cursor-pointer">
                    {tCat(s.category as never)}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Sensitive opt-in */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">{tExp("options")}</p>
            <div className="flex items-start gap-2">
              <Checkbox
                id="opt-sensitive"
                checked={includeSensitive}
                onCheckedChange={(c) => setIncludeSensitive(!!c)}
              />
              <Label
                htmlFor="opt-sensitive"
                className="text-xs font-normal leading-relaxed cursor-pointer"
              >
                {tExp("includeSensitive")}
                <span className="block text-[10px] text-muted-foreground mt-0.5">
                  {tExp("includeSensitiveHint")}
                </span>
              </Label>
            </div>
          </div>

          {/* PII acknowledgement */}
          <div className="flex items-start gap-2 border-t border-border pt-3">
            <Checkbox
              id="opt-ack"
              checked={acknowledged}
              onCheckedChange={(c) => setAcknowledged(!!c)}
            />
            <Label htmlFor="opt-ack" className="text-xs font-normal leading-relaxed cursor-pointer">
              {tExp("acknowledge")}
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {tExp("cancel")}
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={generating || !acknowledged}
            className="gap-2"
          >
            {generating ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Download className="size-3.5" aria-hidden />
            )}
            {generating ? t("exportPdfLoading") : t("exportPdf")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Inline Export Button (convenience wrapper) ───────────────────────────────

interface ExportPdfInlineButtonProps {
  report: HealthReport;
  size?: "sm" | "default";
}

export function ExportPdfInlineButton({ report, size = "sm" }: ExportPdfInlineButtonProps) {
  const t = useTranslations("reports");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size={size}
        className="gap-2 text-xs"
        onClick={() => setOpen(true)}
        aria-label={t("exportPdf")}
      >
        <Download className="size-3.5" aria-hidden />
        {t("exportPdf")}
      </Button>
      <ExportPdfDialog open={open} onOpenChange={setOpen} report={report} />
    </>
  );
}
