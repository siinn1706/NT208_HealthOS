import { getTranslations, getLocale } from "next-intl/server";
import { Brain, ShieldCheck } from "lucide-react";
import { headers } from "next/headers";
import { RiskGaugeRow } from "@/components/dashboard/risk/RiskGaugeRow";
import { RiskRefreshButton } from "@/components/dashboard/risk/RiskRefreshButton";
import type { RiskPredictionSummary } from "@/types/api";

async function fetchRiskPredictions(): Promise<RiskPredictionSummary> {
  const t = await getTranslations("dashboard.risk");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const noInfo = t("noInfo");
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
  return {
    generatedAt: "",
    overallScore: 0,
    risks: [],
    disclaimer: noInfo,
  };
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

  const generated = data.generatedAt
    ? new Date(data.generatedAt).toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : t("noInfo");

  const highCount = data.risks.filter((r) => r.level === "high" || r.level === "critical").length;
  const moderateCount = data.risks.filter((r) => r.level === "moderate").length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("subtitle")}
          </p>
        </div>

        {/* Refresh */}
        <RiskRefreshButton />
      </div>

      {/* ── Score overview card ── */}
      <div className="rounded-xl border border-border bg-card p-5">
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
              <p className="text-2xl font-bold text-foreground">{data.risks.length}</p>
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
      </div>

      {/* ── Risk rows ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">{t("monitoredRisks")}</h2>
        {data.risks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noInfo")}</p>
        ) : (
          data.risks
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
  );
}
