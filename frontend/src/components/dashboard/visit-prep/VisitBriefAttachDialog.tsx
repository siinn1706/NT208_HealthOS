"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarPlus, Stethoscope } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Link } from "@/navigation";
import type { Appointment, AppointmentBriefLink } from "@/types/api";
import { attachToAppointment } from "./VisitPrepApi";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  briefId: string;
  /** Optional pre-selected appointment id (e.g. from `?attach=` query). */
  preselectAppointmentId?: string | null;
  onAttached?: (link: AppointmentBriefLink) => void;
}

async function fetchUpcomingAppointments(): Promise<Appointment[]> {
  try {
    const res = await fetch("/api/v1/appointments?page=1&limit=50", {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json().catch(() => null)) as
      | { data?: unknown[] }
      | null;
    if (!Array.isArray(json?.data)) return [];
    const now = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json!.data as any[])
      .map((item) => ({
        id: item?.id ?? "",
        date: item?.appointment_date ?? "",
        doctorName: item?.doctor_name ?? "",
        specialty: item?.specialty ?? "",
        clinic: item?.clinic ?? "",
        diagnosis: item?.diagnosis ?? "",
        status: item?.status ?? "upcoming",
        hasPrescription: false,
        prescription: null,
      }))
      .filter((a) => {
        if (!a.id || !a.date) return false;
        const ts = new Date(a.date).getTime();
        if (Number.isNaN(ts)) return false;
        // upcoming-ish: future OR within 1 day past (so the user can attach
        // a brief on the morning of the visit even if BE clock drifted).
        return ts >= now - 24 * 60 * 60 * 1000;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) as Appointment[];
  } catch {
    return [];
  }
}

export function VisitBriefAttachDialog({
  open,
  onOpenChange,
  briefId,
  preselectAppointmentId,
  onAttached,
}: Props) {
  const t = useTranslations("dashboard.visitPrep.attach");
  const locale = useLocale();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [attaching, setAttaching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchUpcomingAppointments().then((items) => {
      if (cancelled) return;
      setAppointments(items);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (open && preselectAppointmentId) {
      void handleAttach(preselectAppointmentId, /* skipPreselect= */ true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preselectAppointmentId]);

  async function handleAttach(appointmentId: string, skipPreselect = false) {
    setAttaching(appointmentId);
    setError(null);
    try {
      const link = await attachToAppointment(briefId, appointmentId);
      onAttached?.(link);
      if (!skipPreselect) onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAttaching(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="h-4 w-4 text-primary" aria-hidden />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">…</div>
        ) : appointments.length === 0 ? (
          <div className="space-y-3 py-4 text-sm text-muted-foreground">
            <p>{t("noUpcoming")}</p>
            <Link
              href="/dashboard/appointments"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              {t("createAppointment")}
            </Link>
          </div>
        ) : (
          <ul className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {appointments.map((appt) => {
              const date = new Date(appt.date);
              const dateLabel = date.toLocaleString(locale, {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              const busy = attaching === appt.id;
              return (
                <li key={appt.id}>
                  <button
                    type="button"
                    onClick={() => handleAttach(appt.id)}
                    disabled={busy || attaching !== null}
                    className={cn(
                      "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors",
                      "hover:border-primary/40 hover:bg-primary/5",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      busy && "opacity-60",
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {appt.doctorName || "—"}{" "}
                      <span className="font-normal text-muted-foreground">
                        · {appt.specialty || appt.clinic || "—"}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{dateLabel}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-primary">
                      {busy ? "…" : t("attachAction")}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
