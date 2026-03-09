import { Brain, RefreshCw, ShieldCheck } from "lucide-react";
import { MOCK_RISK_PREDICTIONS } from "@/data/risk";
import { RiskGaugeRow } from "@/components/dashboard/risk/RiskGaugeRow";

// BFF TODO: GET /api/v1/health/risk-predictions
// Trigger: server-side page load
// Request: { timeframe: "current" }
// Response: { risks: RiskItem[]; overallScore: number; generatedAt: string; disclaimer: string }
// Fallback: MOCK_RISK_PREDICTIONS from @/data/risk

function HealthScoreRing({ score }: { score: number }) {
  // SVG ring — 120px, stroke-dashoffset based on score 0-100
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;
  const color = score >= 70 ? "#4ADE80" : score >= 50 ? "#FBBF24" : "#F97316";
  const label = score >= 70 ? "Tốt" : score >= 50 ? "Trung bình" : "Cần cải thiện";

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
  // Server component — swap with real BFF fetch in V1
  const data = MOCK_RISK_PREDICTIONS;

  const generated = new Date(data.generatedAt).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const highCount = data.risks.filter((r) => r.level === "high" || r.level === "critical").length;
  const moderateCount = data.risks.filter((r) => r.level === "moderate").length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" aria-hidden />
            <h1 className="text-xl font-bold text-foreground">Dự đoán rủi ro sức khỏe</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Phân tích AI dựa trên dữ liệu sinh trắc học và hành vi của bạn
          </p>
        </div>

        {/* Refresh – BFF TODO: POST /api/v1/health/risk-predictions/refresh */}
        <button
          className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer self-start"
          aria-label="Cập nhật dự đoán mới"
        >
          <RefreshCw className="w-4 h-4" />
          Cập nhật
        </button>
      </div>

      {/* ── Score overview card ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Ring */}
          <HealthScoreRing score={data.overallScore} />

          {/* Stats */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 text-center sm:text-left">
            <div>
              <p className="text-2xl font-bold text-foreground">{data.risks.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Điều kiện theo dõi</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-500">{highCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Mức độ cao</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{moderateCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Trung bình</p>
            </div>
          </div>

          {/* Generated time */}
          <div className="text-center sm:text-right flex-shrink-0">
            <p className="text-[11px] text-muted-foreground">Cập nhật lần cuối</p>
            <p className="text-xs font-medium text-foreground mt-0.5">{generated}</p>
          </div>
        </div>
      </div>

      {/* ── Risk rows ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Các rủi ro được theo dõi</h2>
        {data.risks
          .sort((a, b) => b.probability - a.probability)
          .map((risk, i) => (
            <RiskGaugeRow key={risk.id} risk={risk} defaultExpanded={i === 0} />
          ))}
      </div>

      {/* ── Medical disclaimer ── */}
      <div className="rounded-xl border border-border bg-muted/20 px-5 py-4 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden />
        <p className="text-xs text-muted-foreground leading-relaxed">{data.disclaimer}</p>
      </div>
    </div>
  );
}
