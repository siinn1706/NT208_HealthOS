// KpiCard.test.tsx — unit tests for KpiCard component

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiCard } from "../KpiCard";

describe("KpiCard", () => {
  it("renders label and value", () => {
    render(<KpiCard label="Total Users" value="1,234" />);
    expect(screen.getByText("Total Users")).toBeTruthy();
    expect(screen.getByText("1,234")).toBeTruthy();
  });

  it("renders positive delta pill", () => {
    render(<KpiCard label="Signups" value="42" delta="+5%" />);
    expect(screen.getByText("+5%")).toBeTruthy();
  });

  it("renders negative delta pill", () => {
    render(<KpiCard label="Churn" value="3" delta="-2" />);
    expect(screen.getByText("-2")).toBeTruthy();
  });

  it("renders loading skeleton when isLoading=true (no label/value text)", () => {
    render(<KpiCard label="Total Users" value="1,234" isLoading />);
    expect(screen.queryByText("Total Users")).toBeNull();
    expect(screen.queryByText("1,234")).toBeNull();
  });
});
