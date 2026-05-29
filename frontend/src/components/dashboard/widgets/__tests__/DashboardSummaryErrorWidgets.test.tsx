import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const messages: Record<string, Record<string, string>> = {
  "dashboard.kpi": {
    loadError: "Could not load KPI data",
    noData: "No data",
  },
  "dashboard.goals": {
    title: "Goal Progress",
    loadError: "Could not load goals",
    noInfo: "No information available",
    viewAll: "View All Goals",
  },
  "dashboard.ai": {
    title: "AI Insight",
    subtitle: "Based on your data today",
    askAI: "Ask AI Assistant",
    loadError: "Could not load AI insight",
    noInfo: "No information available",
  },
  "dashboard.risk.insights": {},
};

vi.mock("next-intl/server", () => ({
  getLocale: async () => "en",
  getTranslations: async (namespace: string) => {
    return (key: string) => messages[namespace]?.[key] ?? key;
  },
}));

import { AiInsightWidget } from "@/components/dashboard/widgets/AiInsightWidget";
import { GoalProgressWidget } from "@/components/dashboard/widgets/GoalProgressWidget";
import { KpiRingWidget } from "@/components/dashboard/widgets/KpiRingWidget";
import type { DashboardSummary } from "@/lib/dashboard-data";
import type { DataSlice } from "@/types/data-slice";

const failedSummary: DataSlice<DashboardSummary> = {
  status: "recoverable_error",
  error: {
    code: "DASHBOARD_SUMMARY_FETCH_FAILED",
    message: "Could not load dashboard summary.",
  },
};

describe("dashboard summary widgets recoverable errors", () => {
  it("renders KPI load failure instead of empty KPI rings", async () => {
    render(await KpiRingWidget({ summary: failedSummary }));

    expect(screen.getByText("Could not load KPI data")).toBeInTheDocument();
    expect(screen.getByText("Could not load dashboard summary.")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "No data" })).not.toBeInTheDocument();
  });

  it("renders goal load failure instead of no-info state", async () => {
    render(await GoalProgressWidget({ summary: failedSummary }));

    expect(screen.getByText("Goal Progress")).toBeInTheDocument();
    expect(screen.getByText("Could not load dashboard summary.")).toBeInTheDocument();
    expect(screen.queryByText("No information available")).not.toBeInTheDocument();
  });

  it("renders AI insight load failure instead of no-info state", async () => {
    render(await AiInsightWidget({ summary: failedSummary }));

    expect(screen.getByText("AI Insight")).toBeInTheDocument();
    expect(screen.getByText("Could not load dashboard summary.")).toBeInTheDocument();
    expect(screen.queryByText("No information available")).not.toBeInTheDocument();
  });
});
