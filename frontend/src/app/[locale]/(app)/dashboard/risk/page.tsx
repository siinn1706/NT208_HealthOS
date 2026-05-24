import { getTranslations, getLocale } from "next-intl/server";
import { Brain, ShieldCheck } from "lucide-react";
import { headers } from "next/headers";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("risk") };
}
import { RiskGaugeRow } from "@/components/dashboard/risk/RiskGaugeRow";
import { RiskRefreshButton } from "@/components/dashboard/risk/RiskRefreshButton";
import { PageHeader } from "@/components/shared/page";
import { StaleDataIndicator } from "@/components/shared/state";
import type { RiskPredictionSummary } from "@/types/api";

/**
 * Returns `null` when the model has produced no output at all, so the page
 * can render an explicit "no data" affordance instead of a 0-of-100 ring
 * that visually reads as "worst possible health" (plan §B2).
 */
async function fetchRiskPredictions(): Promise<RiskPredictionSummary | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const reqHeaders = await headers();
    const res = await fetch(`${appUrl}/api/v1/health/risk-predictions?timeframe=current`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });
    if (res.ok) {
      const json = await res.json();
      const data = json?.data;
      if (data) {
        return data as RiskPredictionSummary;
      }
    }
  } catch {}
  return null;
}

function HealthScoreRing({ score, scoreGood, scoreAverage, scoreNeedsWork }: {
  score: number;
  scoreGood: string;
  scoreAverage: string;
  scoreNeedsWork: string;
}) {
  // SVG ring — 120px, stroke-dashoffset based on score 0-100
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;
  const color = score >= 70 ? "#4ADE80" : score >= 50 ? "#FBBF24" : "#F97316";
  const label = score >= 70 ? scoreGood : score >= 50 ? scoreAverage : scoreNeedsWork;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full -rotate-90"
          aria-hidden
        >
          {/* Track */}
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/30"
          />
          {/* Progress */}
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - filled}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{score}</span>
          <span className="text-[10px] text-muted-foreground">/ 100</span>
        </div>
      </div>
      <p className="text-xs font-medium mt-2" style={{ color }}>
        {label}
      </p>
    </div>
  );
}

export default async function RiskPage() {
  const t = await getTranslations("dashboard.risk");
  const locale = await getLocale();
  const data = await fetchRiskPredictions();
  const hasData = data !== null;

  const generated = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : t("noInfo");

  const risks = data?.risks ?? [];
  const highCount = risks.filter((r) => r.level === "high" || r.level === "critical").length;
  const moderateCount = risks.filter((r) => r.level === "moderate").length;

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-muted-foreground" aria-hidden />
            {t("title")}
          </span>
        }
        description={t("subtitle")}
        primaryAction={<RiskRefreshButton />}
        meta={
          data?.generatedAt ? (
            <StaleDataIndicator
              updatedAt={data.generatedAt}
              staleAfterMs={24 * 60 * 60_000}
            />
          ) : null
        }
      />
      <div className="max-w-[1400px] mx-auto space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* ── Score overview card ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        {hasData ? (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Ring */}
            <HealthScoreRing
              score={data.overallScore}
              scoreGood={t("scoreGood")}
              scoreAverage={t("scoreAverage")}
              scoreNeedsWork={t("scoreNeedsWork")}
            />

            {/* Stats */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 text-center sm:text-left">
              <div>
                <p className="text-2xl font-bold text-foreground">{risks.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("monitoredConditions")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">{highCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("highLevel")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-400">{moderateCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("moderateLevel")}</p>
              </div>
            </div>

            {/* Generated time */}
            <div className="text-center sm:text-right flex-shrink-0">
              <p className="text-[11px] text-muted-foreground">{t("lastUpdated")}</p>
              <p className="text-xs font-medium text-foreground mt-0.5">{generated}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-2 py-6">
            <Brain className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium text-foreground">{t("noModelOutputTitle")}</p>
            <p className="text-xs text-muted-foreground max-w-md">{t("noModelOutputBody")}</p>
          </div>
        )}
      </div>

      {/* ── Risk rows ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">{t("monitoredRisks")}</h2>
        {risks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noInfo")}</p>
        ) : (
          risks
            .sort((a, b) => b.probability - a.probability)
            .map((risk, i) => (
              <RiskGaugeRow key={risk.id} risk={risk} defaultExpanded={i === 0} />
            ))
        )}
      </div>

      {/* ── Medical disclaimer ── */}
      <div className="rounded-xl border border-border bg-muted/20 px-5 py-4 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden />
        <p className="text-xs text-muted-foreground leading-relaxed">{t("disclaimer")}</p>
      </div>
      </div>
    </>
  );
}
