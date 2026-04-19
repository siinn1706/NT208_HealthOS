"use client";

import * as React from "react";
import {
  Pill,
  Stethoscope,
  CalendarDays,
  Building2,
  FileText,
  Paperclip,
  Download,
  Eye,
  Trash2,
  Upload,
  PlusSquare,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImportFromAppointmentDialog } from "@/components/dashboard/medications/ImportFromAppointmentDialog";
import type { Prescription } from "@/types/api";

/**
 * Prescription viewer (UX plan §F + B7 P4 attachments).
 */

interface PrescriptionViewerDialogProps {
  prescription: Prescription | null;
  /** Appointment id — required to fetch / upload prescription assets. */
  appointmentId?: string;
  onClose: () => void;
}

type PrescriptionAsset = {
  id: string;
  appointment_id: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  original_filename: string | null;
  uploaded_at: string;
};

// Note: dosage chip currently uses the `default` colour for every entry; the
// language-specific category map below is kept for reference but is no longer
// keyed off Vietnamese strings (so an English-locale prescription doesn't fall
// to a different colour by accident).
const CATEGORY_COLORS = {
  default: "var(--color-warm-gold)",
} as const;

export function PrescriptionViewerDialog({
  prescription,
  appointmentId,
  onClose,
}: PrescriptionViewerDialogProps) {
  const t = useTranslations("dashboard.appointments");
  const tAttach = useTranslations("dashboard.appointments.attachments");
  const tMedImport = useTranslations("dashboard.medications.import");
  const locale = useLocale();
  const [importOpen, setImportOpen] = React.useState(false);

  const open = prescription !== null;
  // Only offer the import CTA when there is at least one medicine to act on.
  // When the user fires it, we render the import dialog OUTSIDE the parent
  // Dialog so the two modals don't fight for focus / portal layering.
  const canImport =
    Boolean(appointmentId) &&
    prescription !== null &&
    prescription.medicines.length > 0;

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

              {canImport && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center gap-2"
                  onClick={() => setImportOpen(true)}
                >
                  <PlusSquare className="w-4 h-4" />
                  {tMedImport("submit")}
                </Button>
              )}

              {appointmentId && (
                <AttachmentsPanel
                  appointmentId={appointmentId}
                  t={tAttach}
                  locale={locale}
                />
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
      {canImport && appointmentId && prescription && (
        <ImportFromAppointmentDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          appointmentId={appointmentId}
          medicines={prescription.medicines}
          onImported={(result) => {
            if (result.created.length > 0) {
              toast.success(
                tMedImport("result", {
                  created: result.created.length,
                  skipped: result.skipped.length,
                }),
              );
            }
          }}
        />
      )}
    </Dialog>
  );
}

function AttachmentsPanel({
  appointmentId,
  t,
  locale,
}: {
  appointmentId: string;
  t: ReturnType<typeof useTranslations>;
  locale: string;
}) {
  const [assets, setAssets] = React.useState<PrescriptionAsset[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/appointments/${encodeURIComponent(appointmentId)}/prescription/assets`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        setError(t("loadError"));
        return;
      }
      const json = await res.json().catch(() => null);
      const list = Array.isArray(json?.data) ? (json.data as PrescriptionAsset[]) : [];
      setAssets(list);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [appointmentId, t]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // reset so the same file can be re-picked
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file, file.name);
      const res = await fetch(
        `/api/v1/appointments/${encodeURIComponent(appointmentId)}/prescription/assets`,
        { method: "POST", body: fd },
      );
      if (res.status === 413) {
        toast.error(t("tooLarge"));
        return;
      }
      if (res.status === 415) {
        toast.error(t("unsupportedType"));
        return;
      }
      if (!res.ok) {
        toast.error(t("uploadError"));
        return;
      }
      toast.success(t("uploadSuccess"));
      await refresh();
    } catch {
      toast.error(t("uploadError"));
    } finally {
      setUploading(false);
    }
  };

  const openSignedUrl = async (asset: PrescriptionAsset, asDownload: boolean) => {
    try {
      const res = await fetch(
        `/api/v1/appointments/${encodeURIComponent(appointmentId)}/prescription/assets/${asset.id}/url`,
      );
      if (!res.ok) {
        toast.error(t("urlError"));
        return;
      }
      const json = await res.json().catch(() => null);
      const url: string | undefined = json?.data?.url;
      if (!url) {
        toast.error(t("urlError"));
        return;
      }
      if (asDownload) {
        const a = document.createElement("a");
        a.href = url;
        a.download = asset.original_filename ?? "prescription";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.error(t("urlError"));
    }
  };

  const handleDelete = async (asset: PrescriptionAsset) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      const res = await fetch(
        `/api/v1/appointments/${encodeURIComponent(appointmentId)}/prescription/assets/${asset.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        toast.error(t("deleteError"));
        return;
      }
      toast.success(t("deleteSuccess"));
      await refresh();
    } catch {
      toast.error(t("deleteError"));
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-muted-foreground" aria-hidden />
          <p className="text-sm font-semibold text-foreground">{t("title")}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePickFile}
          disabled={uploading}
          className="gap-2"
        >
          <Upload className="w-3.5 h-3.5" aria-hidden />
          {uploading ? t("uploading") : t("upload")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
        </div>
      ) : error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : assets.length === 0 ? (
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          {t("none")}
        </p>
      ) : (
        <ul role="list" className="divide-y divide-border rounded-md border border-border">
          {assets.map((asset) => (
            <li key={asset.id} className="flex items-center gap-2 px-3 py-2">
              <FileText className="size-4 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {asset.original_filename ?? `${asset.mime_type} · ${asset.id.slice(0, 8)}`}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {(asset.size_bytes / 1024).toFixed(0)} KB ·{" "}
                  {new Date(asset.uploaded_at).toLocaleDateString(locale)}
                </p>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={t("view")}
                onClick={() => openSignedUrl(asset, false)}
              >
                <Eye className="size-4" aria-hidden />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={t("download")}
                onClick={() => openSignedUrl(asset, true)}
              >
                <Download className="size-4" aria-hidden />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={t("delete")}
                onClick={() => handleDelete(asset)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
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
