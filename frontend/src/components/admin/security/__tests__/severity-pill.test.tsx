// severity-pill.test.tsx — unit tests for SeverityPill

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeverityPill } from "../severity-pill";

describe("SeverityPill", () => {
  it.each(["low", "medium", "high", "critical"] as const)(
    "renders %s with capitalized label",
    (severity) => {
      render(<SeverityPill severity={severity} />);
      const expected = severity.charAt(0).toUpperCase() + severity.slice(1);
      expect(screen.getByText(expected)).toBeTruthy();
    },
  );

  it("renders unknown severity without throwing", () => {
    render(<SeverityPill severity="unknown" />);
    expect(screen.getByText("Unknown")).toBeTruthy();
  });

  it("critical uses same danger color as high", () => {
    const { container: criticalContainer } = render(<SeverityPill severity="critical" />);
    const { container: highContainer } = render(<SeverityPill severity="high" />);
    const criticalSpan = criticalContainer.querySelector("span");
    const highSpan = highContainer.querySelector("span");
    // Both use --admin-status-danger-soft background
    expect(criticalSpan?.className).toContain("admin-status-danger-soft");
    expect(highSpan?.className).toContain("admin-status-danger-soft");
    // critical adds font-bold
    expect(criticalSpan?.className).toContain("font-bold");
    expect(highSpan?.className).not.toContain("font-bold");
  });
});
