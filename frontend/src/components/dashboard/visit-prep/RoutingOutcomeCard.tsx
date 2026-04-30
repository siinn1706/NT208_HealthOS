"use client";

import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  Heart,
  Info,
  Phone,
  Stethoscope,
} from "lucide-react";
import { Link } from "@/navigation";
import { cn } from "@/lib/utils";
import type { TriageBucket, TriageOutcome } from "@/types/api";

interface Props {
  outcome: TriageOutcome | null;
  /** Called when the user clicks "Recompute" — useful when symptoms changed
   * but the latest outcome is still loading. */
  onRecompute?: () => void;
  isRecomputing?: boolean;
  /** Wires the routine/insufficient-info CTAs straight into the appointment
   * create sheet instead of the appointments list page (review fix U3). */
  onBookAppointment?: () => void;
  className?: string;
}

const IS_DEV = process.env.NODE_ENV !== "production";

interface BucketVisuals {
  icon: typeof Stethoscope;
  /** Tailwind utility classes for the card surface. We deliberately use
   * accent-warning / muted tones — never alarmist red — even on emergency
   * (the urgency comes from copy + the embedded emergency tile, not color). */
  surface: string;
  ring: string;
  iconBg: string;
  iconColor: string;
  ariaRole: "status" | "alert";
}

const VISUALS: Record<TriageBucket, BucketVisuals> = {
  emergency_now: {
    icon: AlertTriangle,
    surface: "border-warning/40 bg-warning/5",
    ring: "ring-1 ring-warning/30",
    iconBg: "bg-warning/15",
    iconColor: "text-warning",
    ariaRole: "alert",
  },
  urgent_same_day: {
    icon: AlertTriangle,
    surface: "border-warning/30 bg-warning/5",
    ring: "ring-1 ring-warning/20",
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    ariaRole: "status",
  },
  routine_gp: {
    icon: Stethoscope,
    surface: "border-primary/30 bg-primary/5",
    ring: "ring-1 ring-primary/20",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    ariaRole: "status",
  },
  self_care_with_monitoring: {
    icon: Heart,
    surface: "border-success/30 bg-success/5",
    ring: "ring-1 ring-success/20",
    iconBg: "bg-success/10",
    iconColor: "text-success",
    ariaRole: "status",
  },
  insufficient_info: {
    icon: Info,
    surface: "border-border bg-card",
    ring: "",
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    ariaRole: "status",
  },
};

export function RoutingOutcomeCard({
  outcome,
  onRecompute,
  isRecomputing,
  onBookAppointment,
  className,
}: Props) {
  const t = useTranslations("dashboard.visitPrep.routing");

  if (!outcome) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-border bg-muted/20 px-5 py-6 text-sm text-muted-foreground",
          className,
        )}
      >
        {t("noMatches")}
      </div>
    );
  }

  const cfg = VISUALS[outcome.bucket];
  const Icon = cfg.icon;
  const titleKey = `${outcome.bucket}.title` as const;
  const bodyKey = `${outcome.bucket}.body` as const;
  const nextActionKey = `${outcome.bucket}.next_action` as const;

  return (
    <section
      role={cfg.ariaRole}
      aria-live={cfg.ariaRole === "alert" ? "assertive" : "polite"}
      className={cn(
        "rounded-2xl border p-5 space-y-4",
        cfg.surface,
        cfg.ring,
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full",
            cfg.iconBg,
          )}
          aria-hidden
        >
          <Icon className={cn("h-5 w-5", cfg.iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">
            {t(titleKey)}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-foreground/80">
            {t(bodyKey)}
          </p>
        </div>
      </div>

      {/* Emergency tile sits FIRST inside the emergency variant — we want
          calling help to be the visually dominant action, not a button below
          the fold (plan §3). */}
      {outcome.bucket === "emergency_now" && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
          <div className="flex items-center gap-2 font-semibold text-warning">
            <Phone className="h-4 w-4" aria-hidden />
            {t("emergency_now.next_action")}
          </div>
          <p className="mt-1 text-xs text-foreground/80">
            {t("emergency_now.emergencyHint")}
          </p>
        </div>
      )}

      {/* Same-day-care hint tile in the urgent variant — gives the user a
          concrete number/line to call instead of just a CTA verb. */}
      {outcome.bucket === "urgent_same_day" && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          <div className="flex items-center gap-2 font-semibold text-warning">
            <Phone className="h-4 w-4" aria-hidden />
            {t("urgent_same_day.next_action")}
          </div>
          <p className="mt-1 text-xs text-foreground/80">
            {t("urgent_same_day.urgentHint")}
          </p>
        </div>
      )}

      {/* Self-care "watch for these" list — driven by the i18n raw array so
          translators can add/remove items without touching the component
          (review fix M2). */}
      {outcome.bucket === "self_care_with_monitoring" &&
        (() => {
          const raw = t.raw("self_care_with_monitoring.watchItems");
          const items: string[] = Array.isArray(raw)
            ? raw.filter((x): x is string => typeof x === "string")
            : [];
          if (items.length === 0) return null;
          return (
            <div className="rounded-xl border border-border bg-card/60 px-4 py-3 text-sm">
              <p className="font-medium text-foreground">
                {t("self_care_with_monitoring.watchTitle")}
              </p>
              <ul className="mt-2 space-y-1 text-xs text-foreground/80">
                {items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className="mt-1 inline-block h-1 w-1 rounded-full bg-foreground/60"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

      {/* Matched signals — calm, bullet-form, never sounds like a diagnosis. */}
      {outcome.matched_signals.length > 0 && (
        <div className="rounded-xl border border-border bg-card/60 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">
            {t("matchedSignals")}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-foreground/90">
            {outcome.matched_signals.map((sig, idx) => (
              <li
                key={`${sig.rule_id}-${idx}`}
                className="flex items-start gap-2"
              >
                <CheckCircle2
                  className={cn("mt-0.5 h-3.5 w-3.5 flex-shrink-0", cfg.iconColor)}
                  aria-hidden
                />
                <span>{t(sig.copy_key.replace(/^visitPrep\.routing\./, "") as never)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {outcome.bucket === "routine_gp" || outcome.bucket === "insufficient_info" ? (
          // Review fix U3: prefer the in-app appointment-create sheet via
          // `onBookAppointment` when the parent provides it (the wizard does);
          // fall back to the appointments page link otherwise (e.g. the
          // standalone print preview).
          onBookAppointment ? (
            <button
              type="button"
              onClick={onBookAppointment}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <CalendarPlus className="h-4 w-4" aria-hidden />
              {t(nextActionKey)}
            </button>
          ) : (
            <Link
              href="/dashboard/appointments"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <CalendarPlus className="h-4 w-4" aria-hidden />
              {t(nextActionKey)}
            </Link>
          )
        ) : null}

        {/* Review fix S3: insufficient_info gains an actionable secondary
            urgent-care CTA so a vague-but-serious symptom isn't routed only
            to "book a routine appointment". */}
        {outcome.bucket === "insufficient_info" && (
          <a
            href="tel:115"
            aria-label={`${t("insufficient_info.urgentSecondary")}. ${t("emergency_now.emergencyHint")}`}
            className="inline-flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden />
            {t("insufficient_info.urgentSecondary")}
          </a>
        )}

        {onRecompute && (
          <button
            type="button"
            onClick={onRecompute}
            disabled={isRecomputing}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
          >
            {t("recompute")}
          </button>
        )}

        {/* Review fix L1: ruleset version footer is QA scaffolding — keep it
            visible in dev but hide in production so patients never see
            "Ruleset v1.1.0" on a clinical card. */}
        {IS_DEV && (
          <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("rulesetVersion", { version: outcome.ruleset_version })}
          </span>
        )}
      </div>
    </section>
  );
}
