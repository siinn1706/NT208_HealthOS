"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/navigation";
import {
  Pill,
  Pause,
  Clock,
  Droplet,
  CheckCircle2,
  Archive,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Adherence, MedicationPlan } from "@/types/api";
import { AdherenceRing } from "./AdherenceRing";

interface MedicationCardProps {
  plan: MedicationPlan;
  adherence?: Adherence | null;
}

function _daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return null;
  const now = Date.now();
  const ms = target - now;
  // Round so "today" reads as 0, not -0/-1.
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export function MedicationCard({ plan, adherence }: MedicationCardProps) {
  const t = useTranslations("dashboard.medications.card");
  const locale = useLocale();

  const refillDays = _daysUntil(plan.next_refill_estimated_at);
  const showRefill = refillDays !== null && refillDays <= 7;
  const refillOverdue = refillDays !== null && refillDays < 0;

  const nextDoseDisplay = plan.next_dose_at
    ? new Date(plan.next_dose_at).toLocaleString(locale, {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : t("noNext");

  const statusChip = (() => {
    if (plan.status === "active") return null;
    return (
      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground border-border">
        {plan.status === "paused" && t("paused")}
        {plan.status === "completed" && t("completed")}
        {plan.status === "cancelled" && t("cancelled")}
      </span>
    );
  })();

  return (
    <Link
      href={`/dashboard/medications/${plan.id}` as never}
      className={cn(
        "block group rounded-xl border border-border bg-card px-5 py-4 transition-colors",
        "hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        plan.status !== "active" && "opacity-80",
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex-shrink-0 size-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(231, 222, 167, 0.18)" }}
          aria-hidden
        >
          {plan.status === "paused" ? (
            <Pause className="size-5 text-muted-foreground" />
          ) : plan.status === "cancelled" ? (
            <Archive className="size-5 text-muted-foreground" />
          ) : (
            <Pill className="size-5" style={{ color: "#C9A95A" }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">
              {plan.name}
              {plan.strength && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {plan.strength}
                </span>
              )}
            </p>
            {statusChip}
          </div>

          <div className="mt-1.5 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" aria-hidden />
              <span className="text-muted-foreground/80">{t("nextDose")}:</span>
              <span className="text-foreground/80">{nextDoseDisplay}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3" aria-hidden />
              {t("doses", { n: plan.dose_count })}
            </span>
          </div>

          {showRefill && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-warm-gold/40 bg-warm-gold/10 px-2 py-1 text-[11px] font-medium text-foreground">
              <Droplet className="size-3 text-warm-gold" aria-hidden />
              {refillOverdue
                ? t("refillOverdue")
                : t("refillIn", { days: Math.max(0, refillDays!) })}
            </div>
          )}
        </div>

        <div className="flex-shrink-0">
          <AdherenceRing adherence={adherence ?? null} size={56} stroke={5} />
        </div>
      </div>
    </Link>
  );
}
