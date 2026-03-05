/**
 * Reports server-side data helpers.
 * Called ONLY in Server Components (no "use client").
 * Mock Phase 1 — V1 will proxy to Core BE /v1/reports.
 */

import type {
  HealthReport,
  ReportPeriod,
  ReportSection,
  ReportAlert,
  TimeseriesPoint,
  SectionStats,
  TrendAnalysis,
  ShareRequest,
  ShareResult,
  AnomalyPoint,
  TrendDirection,
} from "@/types/api";

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function periodToDays(period: ReportPeriod): number {
  return period === "7d" ? 7 : period === "30d" ? 30 : 90;
}

function buildDates(days: number): string[] {
  return Array.from({ length: days }, (_, i) => daysAgo(days - 1 - i));
}

function calcStats(
  values: number[],
  unit: string,
  higherIsBetter = true
): SectionStats {
  const valid = values.filter((v) => !isNaN(v));
  const avg = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
  const mn = Math.round(Math.min(...valid));
  const mx = Math.round(Math.max(...valid));
  const first = valid.slice(0, Math.floor(valid.length / 3));
  const last = valid.slice(-Math.floor(valid.length / 3));
  const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
  const lastAvg = last.reduce((a, b) => a + b, 0) / last.length;
  const change = Math.round(((lastAvg - firstAvg) / firstAvg) * 100);
  let trend: TrendDirection;
  if (Math.abs(change) < 3) {
    trend = "stable";
  } else if ((higherIsBetter && change > 0) || (!higherIsBetter && change < 0)) {
    trend = "improving";
  } else {
    trend = "declining";
  }
  return { average: avg, min: mn, max: mx, trend, change_percent: change, unit };
}

// ─── Section builders ───────────────────────────────────────────────────────

function buildVitalsSection(dates: string[]): ReportSection {
  const n = dates.length;
  const hrBase = 72;
  const sysBase = 122;
  const diaBase = 80;

  const data: TimeseriesPoint[] = dates.map((date, i) => {
    const noise = Math.sin(i * 0.7) * 8;
    const hr = Math.round(hrBase + noise + (i > n * 0.6 ? 10 : 0)); // spike near end
    const sys = Math.round(sysBase + noise * 0.5 + (i > n * 0.7 ? 15 : 0));
    const dia = Math.round(diaBase + noise * 0.3 + (i > n * 0.7 ? 8 : 0));
    return { date, value: hr, value2: sys, value3: dia };
  });

  const hrValues = data.map((d) => d.value);
  const stats = calcStats(hrValues, "bpm", false); // lower HR generally better for resting

  const alerts: ReportAlert[] = [];
  const lastHr = hrValues[hrValues.length - 1];
  if (lastHr > 100) {
    alerts.push({
      id: "vital-alert-1",
      severity: "warning",
      metric: "Nhịp tim",
      message: `Nhịp tim lúc nghỉ ngơi ${lastHr} bpm — cao hơn ngưỡng bình thường (60–100 bpm).`,
      value: lastHr,
      threshold: 100,
      unit: "bpm",
      timestamp: dates[dates.length - 1] + "T08:30:00",
    });
  }
  const lastSys = data[data.length - 1].value2!;
  if (lastSys > 139) {
    alerts.push({
      id: "vital-alert-2",
      severity: "warning",
      metric: "Huyết áp tâm thu",
      message: `Huyết áp tâm thu ${lastSys} mmHg — tiền tăng huyết áp (≥ 130 mmHg).`,
      value: lastSys,
      threshold: 139,
      unit: "mmHg",
      timestamp: dates[dates.length - 1] + "T08:30:00",
    });
  }

  const status = alerts.some((a) => a.severity === "critical")
    ? "critical"
    : alerts.length > 0
      ? "warning"
      : "normal";

  return {
    category: "vitals",
    title: "Chỉ số sinh tồn",
    summary: `Nhịp tim trung bình ${stats.average} bpm. Huyết áp ${status === "normal" ? "ổn định" : "có dấu hiệu bất thường"}.`,
    status,
    data,
    stats,
    alerts,
  };
}

function buildNutritionSection(dates: string[]): ReportSection {
  const calorieTarget = 2000;
  const data: TimeseriesPoint[] = dates.map((date, i) => {
    const base = 1700 + Math.sin(i * 0.5) * 400;
    const calories = Math.round(base);
    const protein = Math.round(80 + Math.sin(i * 0.6) * 20);
    const carbs = Math.round(220 + Math.sin(i * 0.4) * 50);
    return { date, value: calories, value2: protein, value3: carbs };
  });

  const calValues = data.map((d) => d.value);
  const stats = calcStats(calValues, "kcal", true);

  const alerts: ReportAlert[] = [];
  const missedDays = data.filter((d) => d.value < calorieTarget * 0.7).length;
  if (missedDays > dates.length * 0.4) {
    alerts.push({
      id: "nutrition-alert-1",
      severity: "warning",
      metric: "Lượng calo nạp",
      message: `Bạn đã tiêu thụ ít hơn 70% mục tiêu calo trong ${missedDays} ngày.`,
      value: stats.average,
      threshold: Math.round(calorieTarget * 0.7),
      unit: "kcal",
      timestamp: daysAgo(0),
    });
  }

  return {
    category: "nutrition",
    title: "Dinh dưỡng",
    summary: `TB ${stats.average} kcal/ngày. Protein ${Math.round(data.reduce((a, d) => a + (d.value2 ?? 0), 0) / data.length)}g/ngày.`,
    status: alerts.length > 0 ? "warning" : "normal",
    data,
    stats,
    alerts,
  };
}

function buildActivitySection(dates: string[]): ReportSection {
  const stepTarget = 10000;
  const data: TimeseriesPoint[] = dates.map((date, i) => {
    const steps = Math.round(5000 + Math.sin(i * 0.8) * 4000 + Math.random() * 1000);
    const calo = Math.round(steps * 0.04);
    return { date, value: steps, value2: calo };
  });

  const stepValues = data.map((d) => d.value);
  const stats = calcStats(stepValues, "bước", true);

  const alerts: ReportAlert[] = [];
  if (stats.average < stepTarget * 0.6) {
    alerts.push({
      id: "activity-alert-1",
      severity: "warning",
      metric: "Số bước chân",
      message: `TB ${stats.average.toLocaleString()} bước/ngày — thấp hơn 60% mục tiêu 10,000 bước.`,
      value: stats.average,
      threshold: stepTarget,
      unit: "bước",
      timestamp: daysAgo(0),
    });
  }

  return {
    category: "activity",
    title: "Hoạt động thể chất",
    summary: `TB ${stats.average.toLocaleString()} bước/ngày. ${stats.trend === "improving" ? "Đang cải thiện" : "Cần tăng cường"}.`,
    status: alerts.length > 0 ? "warning" : "normal",
    data,
    stats,
    alerts,
  };
}

function buildSleepSection(dates: string[]): ReportSection {
  const sleepTarget = 7.5; // hours
  const data: TimeseriesPoint[] = dates.map((date, i) => {
    const hours = Math.round((5.5 + Math.sin(i * 0.6) * 2) * 10) / 10;
    const quality = Math.round(50 + Math.sin(i * 0.5) * 30); // 0-100 quality score
    return { date, value: hours, value2: quality };
  });

  const sleepValues = data.map((d) => d.value);
  const stats = calcStats(sleepValues, "giờ", true);

  const alerts: ReportAlert[] = [];
  if (stats.average < 6) {
    alerts.push({
      id: "sleep-alert-1",
      severity: "critical",
      metric: "Giấc ngủ",
      message: `TB ${stats.average}h/đêm — thiếu ngủ nghiêm trọng (< 6h). Ảnh hưởng đến sức khỏe tim mạch.`,
      value: stats.average,
      threshold: 6,
      unit: "giờ",
      timestamp: daysAgo(0),
    });
  } else if (stats.average < sleepTarget) {
    alerts.push({
      id: "sleep-alert-1",
      severity: "warning",
      metric: "Giấc ngủ",
      message: `TB ${stats.average}h/đêm — dưới mức khuyến nghị (7–9h).`,
      value: stats.average,
      threshold: sleepTarget,
      unit: "giờ",
      timestamp: daysAgo(0),
    });
  }

  return {
    category: "sleep",
    title: "Giấc ngủ",
    summary: `TB ${stats.average}h/đêm. Chất lượng ${stats.average >= 7 ? "tốt" : "cần cải thiện"}.`,
    status:
      alerts.some((a) => a.severity === "critical")
        ? "critical"
        : alerts.length > 0
          ? "warning"
          : "normal",
    data,
    stats,
    alerts,
  };
}

function buildBmiSection(dates: string[]): ReportSection {
  // Sample at weekly or bi-weekly intervals
  const sampleEvery = Math.max(1, Math.floor(dates.length / 12));
  const sampledDates = dates.filter((_, i) => i % sampleEvery === 0);

  const startWeight = 72.5;
  const data: TimeseriesPoint[] = sampledDates.map((date, i) => {
    const weight = Math.round((startWeight + (i * 0.1 - 0.3)) * 10) / 10;
    const bmi = Math.round((weight / (1.72 * 1.72)) * 10) / 10; // height 1.72m
    return { date, value: bmi, value2: weight };
  });

  const bmiValues = data.map((d) => d.value);
  const stats = calcStats(bmiValues, "kg/m²", false); // lower BMI (in overweight range) = improving

  const alerts: ReportAlert[] = [];
  const lastBmi = bmiValues[bmiValues.length - 1];
  if (lastBmi >= 30) {
    alerts.push({
      id: "bmi-alert-1",
      severity: "critical",
      metric: "BMI",
      message: `BMI ${lastBmi} — thuộc vùng béo phì (≥ 30). Cần can thiệp y tế.`,
      value: lastBmi,
      threshold: 30,
      unit: "kg/m²",
      timestamp: daysAgo(0),
    });
  } else if (lastBmi >= 25) {
    alerts.push({
      id: "bmi-alert-1",
      severity: "warning",
      metric: "BMI",
      message: `BMI ${lastBmi} — thừa cân (25–29.9). Nên điều chỉnh dinh dưỡng và vận động.`,
      value: lastBmi,
      threshold: 25,
      unit: "kg/m²",
      timestamp: daysAgo(0),
    });
  }

  return {
    category: "bmi",
    title: "Chỉ số BMI & Cân nặng",
    summary: `BMI hiện tại ${lastBmi} kg/m². Cân nặng ${data[data.length - 1].value2} kg.`,
    status:
      alerts.some((a) => a.severity === "critical")
        ? "critical"
        : alerts.length > 0
          ? "warning"
          : "normal",
    data,
    stats,
    alerts,
  };
}

function buildMedicationSection(dates: string[]): ReportSection {
  const data: TimeseriesPoint[] = dates.map((date, i) => {
    // compliance: 0–100%, some misses
    const compliance = i % 7 === 3 || i % 7 === 6 ? 0 : 100;
    return { date, value: compliance };
  });

  const compValues = data.map((d) => d.value);
  const stats = calcStats(compValues, "%", true);

  const alerts: ReportAlert[] = [];
  const missedDays = compValues.filter((v) => v < 100).length;
  if (missedDays > 2) {
    alerts.push({
      id: "med-alert-1",
      severity: "warning",
      metric: "Tuân thủ dùng thuốc",
      message: `Bỏ lỡ ${missedDays} ngày dùng thuốc. Tuân thủ ${stats.average}% — cần cải thiện.`,
      value: stats.average,
      threshold: 90,
      unit: "%",
      timestamp: daysAgo(0),
    });
  }

  return {
    category: "medication",
    title: "Tuân thủ dùng thuốc",
    summary: `Tuân thủ ${stats.average}% trong kỳ. Bỏ lỡ ${missedDays} ngày.`,
    status: alerts.length > 0 ? "warning" : "normal",
    data,
    stats,
    alerts,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function getHealthReport(period: ReportPeriod = "7d"): Promise<HealthReport> {
  const days = periodToDays(period);
  const dates = buildDates(days);

  const sections: ReportSection[] = [
    buildVitalsSection(dates),
    buildNutritionSection(dates),
    buildActivitySection(dates),
    buildSleepSection(dates),
    buildBmiSection(dates),
    buildMedicationSection(dates),
  ];

  const allAlerts = sections.flatMap((s) => s.alerts);
  const overallStatus = allAlerts.some((a) => a.severity === "critical")
    ? "critical"
    : allAlerts.some((a) => a.severity === "warning")
      ? "warning"
      : "normal";

  return {
    id: `report-${period}-${daysAgo(0)}`,
    user_id: "user-mock-1",
    period,
    generated_at: new Date().toISOString(),
    status: overallStatus,
    sections,
    alerts: allAlerts,
  };
}

export async function getReportSection(
  period: ReportPeriod,
  category: string
): Promise<ReportSection | null> {
  const report = await getHealthReport(period);
  return report.sections.find((s) => s.category === category) ?? null;
}

export async function getTrendAnalysis(
  metric: string,
  period: ReportPeriod = "30d"
): Promise<TrendAnalysis> {
  const days = periodToDays(period);
  const dates = buildDates(days);

  // Generic wave data for demo
  const baseMap: Record<string, { base: number; amp: number; unit: string; label: string }> = {
    heart_rate: { base: 74, amp: 10, unit: "bpm", label: "Nhịp tim" },
    blood_pressure: { base: 122, amp: 12, unit: "mmHg", label: "Huyết áp tâm thu" },
    calories: { base: 1700, amp: 400, unit: "kcal", label: "Calo nạp" },
    steps: { base: 7000, amp: 3000, unit: "bước", label: "Số bước" },
    sleep: { base: 6.5, amp: 1.5, unit: "giờ", label: "Giấc ngủ" },
    bmi: { base: 24.5, amp: 0.5, unit: "kg/m²", label: "BMI" },
    weight: { base: 72, amp: 0.8, unit: "kg", label: "Cân nặng" },
  };

  const cfg = baseMap[metric] ?? baseMap.heart_rate;

  const rawValues = dates.map((_, i) => {
    const trend = i * (cfg.amp * 0.02); // slight upward trend
    const wave = Math.sin(i * 0.5) * cfg.amp * 0.5;
    const noise = (Math.random() - 0.5) * cfg.amp * 0.3;
    return Math.round((cfg.base + trend * 0.3 + wave + noise) * 10) / 10;
  });

  const dataPoints: TimeseriesPoint[] = dates.map((date, i) => ({
    date,
    value: rawValues[i],
  }));

  // Linear regression for trend line
  const n = rawValues.length;
  const xMean = (n - 1) / 2;
  const yMean = rawValues.reduce((a, b) => a + b) / n;
  const slope =
    rawValues.reduce((sum, y, x) => sum + (x - xMean) * (y - yMean), 0) /
    rawValues.reduce((sum, _, x) => sum + (x - xMean) ** 2, 0);
  const intercept = yMean - slope * xMean;
  const trendLine = rawValues.map((_, i) =>
    Math.round((intercept + slope * i) * 10) / 10
  );

  // Prediction: extend trend line 7 more days
  const prediction = Array.from({ length: 7 }, (_, i) =>
    Math.round((intercept + slope * (n + i)) * 10) / 10
  );

  // Anomalies: values > 1.5 std dev from mean
  const stdDev = Math.sqrt(
    rawValues.reduce((sum, v) => sum + (v - yMean) ** 2, 0) / n
  );
  const anomalies: AnomalyPoint[] = rawValues
    .map((v, i) => {
      const dev = Math.abs(v - yMean) / stdDev;
      if (dev > 1.5) {
        return {
          date: dates[i],
          value: v,
          deviation_percent: Math.round(dev * 10),
          severity: (dev > 2 ? "critical" : "warning") as "critical" | "warning",
        };
      }
      return null;
    })
    .filter((a): a is AnomalyPoint => a !== null);

  const changePercent = Math.round(((rawValues[n - 1] - rawValues[0]) / rawValues[0]) * 100);
  const trend: TrendDirection =
    Math.abs(changePercent) < 3 ? "stable" : changePercent > 0 ? "improving" : "declining";

  const stats = { average: Math.round(yMean) };

  const aiSummaryMap: Record<string, string> = {
    heart_rate: `Nhịp tim của bạn có xu hướng ${changePercent > 0 ? "tăng" : "giảm"} ${Math.abs(changePercent)}% trong ${days} ngày qua. ${anomalies.length > 0 ? `Phát hiện ${anomalies.length} điểm bất thường cần chú ý.` : "Không có điểm bất thường đáng lo ngại."}`,
    steps: `Số bước đi bộ ${changePercent > 0 ? "đang tăng dần" : "có xu hướng giảm"} (${Math.abs(changePercent)}%). ${stats.average > 8000 ? "Tốt! Bạn đang duy trì mức hoạt động lành mạnh." : "Nên tăng cường đi bộ để đạt mục tiêu 10,000 bước/ngày."}`,
    sleep: `Thời gian ngủ trung bình ${yMean.toFixed(1)}h. ${yMean >= 7 ? "Bạn đang duy trì giấc ngủ đủ giờ." : "Thiếu ngủ kéo dài có thể ảnh hưởng đến sức đề kháng và sức khỏe tim mạch."}`,
    calories: `Lượng calo nạp ${changePercent > 0 ? "tăng" : "giảm"} ${Math.abs(changePercent)}%. Hãy duy trì mức ${cfg.base} kcal/ngày theo kế hoạch dinh dưỡng của bạn.`,
    bmi: `BMI ${changePercent > 0 ? "có xu hướng tăng" : "đang cải thiện dần"}. ${yMean < 25 ? "Trong ngưỡng bình thường." : yMean < 30 ? "Cần theo dõi và kiểm soát cân nặng." : "Cần can thiệp chuyên sâu về dinh dưỡng và vận động."}`,
  };

  return {
    metric,
    metric_label: cfg.label,
    unit: cfg.unit,
    period,
    data_points: dataPoints,
    trend_line: trendLine,
    prediction,
    anomalies,
    trend,
    change_percent: changePercent,
    ai_summary:
      aiSummaryMap[metric] ??
      `Xu hướng ${cfg.label.toLowerCase()} ${changePercent > 0 ? "tăng" : "giảm"} ${Math.abs(changePercent)}% trong kỳ phân tích.`,
  };
}

export async function shareReport(request: ShareRequest): Promise<ShareResult[]> {
  // Mock: simulate async share — in V1 proxies to Core BE notification service
  await new Promise((r) => setTimeout(r, 300));

  return request.recipients.flatMap((recipient) =>
    request.channels.map((channel) => ({
      recipient,
      channel,
      status: "sent" as const,
    }))
  );
}

export async function listRecentReports(): Promise<
  Array<{
    id: string;
    period: ReportPeriod;
    generated_at: string;
    status: "normal" | "warning" | "critical";
    alert_count: number;
  }>
> {
  return [
    { id: "report-30d-2026-02-03", period: "30d", generated_at: daysAgo(0), status: "warning", alert_count: 3 },
    { id: "report-7d-2026-02-10", period: "7d", generated_at: daysAgo(7), status: "warning", alert_count: 2 },
    { id: "report-90d-2025-12-01", period: "90d", generated_at: daysAgo(30), status: "normal", alert_count: 0 },
    { id: "report-7d-2026-01-15", period: "7d", generated_at: daysAgo(47), status: "normal", alert_count: 0 },
  ];
}
