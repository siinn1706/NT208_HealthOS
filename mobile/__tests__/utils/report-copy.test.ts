import {
  reportMetricLabelKey,
  reportPeriodLabelKey,
  trendDirectionLabelKey,
} from "@/utils/report-copy";

describe("report-copy", () => {
  it("reportMetricLabelKey maps known metrics to healthMetrics keys", () => {
    expect(reportMetricLabelKey("heart_rate")).toBe("healthMetrics.heartRate");
    expect(reportMetricLabelKey("steps")).toBe("healthMetrics.steps");
    expect(reportMetricLabelKey("weight_kg")).toBe("healthMetrics.weight");
    expect(reportMetricLabelKey("sleep_minutes")).toBe("healthMetrics.sleep");
  });

  it("reportMetricLabelKey falls back for unknown ids", () => {
    expect(reportMetricLabelKey("unknown_metric")).toBe("reports.unknownMetric");
    expect(reportMetricLabelKey(undefined)).toBe("reports.unknownMetric");
  });

  it("trendDirectionLabelKey maps trend states", () => {
    expect(trendDirectionLabelKey("up")).toBe("reports.trendUp");
    expect(trendDirectionLabelKey("down")).toBe("reports.trendDown");
    expect(trendDirectionLabelKey("stable")).toBe("reports.trendStable");
    expect(trendDirectionLabelKey(undefined)).toBe("reports.trendStable");
  });

  it("reportPeriodLabelKey maps periods", () => {
    expect(reportPeriodLabelKey("7d")).toBe("reports.rangeWeek");
    expect(reportPeriodLabelKey("30d")).toBe("reports.rangeMonth");
    expect(reportPeriodLabelKey("90d")).toBe("reports.rangeQuarter");
    expect(reportPeriodLabelKey(undefined)).toBe("reports.rangeMonth");
  });
});
