"use client";

import { useEffect } from "react";
import type { ConcernCategory, VisitBriefDetail } from "@/types/api";

interface Labels {
  title: string;
  disclaimer: string;
  concernsHeader: string;
  questionsHeader: string;
  routingHeader: string;
  attachHeader: string;
  attachNone: string;
  finalizedTitle: string;
  visitType: string;
}

interface Props {
  brief: VisitBriefDetail;
  locale: string;
  labels: Labels;
  categoryLabels: Record<ConcernCategory, string>;
}

/**
 * Single-column print-friendly view. The page mounts a print-only stylesheet
 * (the `@media print` rules below) and triggers `window.print()` on load —
 * the user gets a native browser print dialog and can save to PDF from
 * there. No new BE work, no PDF pipeline cost in MVP.
 */
export function PrintableBrief({ brief, locale, labels, categoryLabels }: Props) {
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        window.print();
      } catch {
        // Browser blocked auto-print. The "Print" link in the toolbar still works.
      }
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const fmtDate = (iso: string) => new Date(iso).toLocaleString(locale);
  const triage = brief.latest_triage;

  return (
    <>
      {/* Hide the app shell entirely while printing — keep this surface
          ink-friendly and self-contained. */}
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
@media print {
  body * { visibility: hidden; }
  #vp-print, #vp-print * { visibility: visible; }
  #vp-print {
    position: absolute;
    inset: 0;
    background: white;
    color: black;
    padding: 24px;
  }
  .vp-no-print { display: none !important; }
  a[href]::after { content: ""; }
}
@media screen {
  #vp-print { max-width: 720px; margin: 24px auto; padding: 24px; }
}
        `,
        }}
      />

      <article
        id="vp-print"
        className="font-sans text-sm leading-relaxed text-foreground"
      >
        <header className="mb-6 border-b border-border pb-3">
          <h1 className="text-xl font-semibold">{labels.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {labels.visitType} · #{brief.id.slice(0, 8)}
            {brief.finalized_at && ` · ${labels.finalizedTitle}: ${fmtDate(brief.finalized_at)}`}
          </p>
        </header>

        <p className="mb-5 text-xs italic text-muted-foreground">{labels.disclaimer}</p>

        <section className="mb-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider">
            {labels.concernsHeader}
          </h2>
          <ul className="space-y-2">
            {brief.symptoms.map((s) => (
              <li key={s.id} className="break-inside-avoid">
                <p className="font-medium">
                  {s.concern_text}{" "}
                  <span className="text-xs text-muted-foreground">
                    · {categoryLabels[s.concern_category]}
                    {s.severity_0_10 != null && ` · ${s.severity_0_10}/10`}
                    {s.duration_value != null && s.duration_unit
                      ? ` · ${s.duration_value} ${s.duration_unit}`
                      : ""}
                  </span>
                </p>
                {(s.triggers || s.better_with || s.worse_with) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {s.triggers && `Triggers: ${s.triggers}. `}
                    {s.better_with && `Better with: ${s.better_with}. `}
                    {s.worse_with && `Worse with: ${s.worse_with}.`}
                  </p>
                )}
                {s.meds_taken && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Meds taken: {s.meds_taken}
                  </p>
                )}
                {s.prior_care && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Prior care: {s.prior_care}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider">
            {labels.questionsHeader}
          </h2>
          <ol className="ml-5 list-decimal space-y-1">
            {(brief.question_set?.questions ?? [])
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((q) => (
                <li key={q.id}>{locale === "vi" ? q.text_vi : q.text_en}</li>
              ))}
          </ol>
        </section>

        {triage && (
          <section className="mb-5 rounded border border-border p-3 break-inside-avoid">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider">
              {labels.routingHeader}
            </h2>
            <p className="text-sm font-medium">{triage.bucket.replace(/_/g, " ")}</p>
            {triage.matched_signals.length > 0 && (
              <ul className="mt-1 ml-5 list-disc text-xs text-muted-foreground">
                {triage.matched_signals.map((s, i) => (
                  <li key={`${s.rule_id}-${i}`}>{s.signal}</li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[10px] text-muted-foreground">
              Ruleset {triage.ruleset_version} · Computed {fmtDate(triage.computed_at)}
            </p>
          </section>
        )}

        <section className="border-t border-border pt-3 text-xs text-muted-foreground">
          {labels.attachHeader}:{" "}
          {brief.appointment_links.find((l) => l.is_active)?.appointment_id ?? labels.attachNone}
        </section>
      </article>
    </>
  );
}
