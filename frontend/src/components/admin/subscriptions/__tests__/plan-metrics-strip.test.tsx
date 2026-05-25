// plan-metrics-strip.test.tsx — unit tests for PlanMetricsStrip

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlanMetricsStrip, type PlanMetrics } from "../plan-metrics-strip";

const METRICS: PlanMetrics = { free: 100, basic: 250, family: 80, professional: 40 };

describe("PlanMetricsStrip", () => {
  it("renders nothing when metrics is null", () => {
    const { container } = render(<PlanMetricsStrip metrics={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders 4 plan cards when metrics are provided", () => {
    render(<PlanMetricsStrip metrics={METRICS} />);
    expect(screen.getByLabelText("Free active subscribers")).toBeTruthy();
    expect(screen.getByLabelText("Basic active subscribers")).toBeTruthy();
  });

  it("displays formatted subscriber counts", () => {
    render(<PlanMetricsStrip metrics={METRICS} />);
    expect(screen.getByText("100")).toBeTruthy();
    expect(screen.getByText("250")).toBeTruthy();
  });

  it("has accessible group label", () => {
    const { container } = render(<PlanMetricsStrip metrics={METRICS} />);
    expect(container.querySelector('[aria-label="Plan subscriber metrics"]')).toBeTruthy();
  });
});
