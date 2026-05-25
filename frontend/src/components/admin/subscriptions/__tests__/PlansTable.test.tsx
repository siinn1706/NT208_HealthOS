/**
 * PlansTable example tests
 *
 * Validates: Requirements 9.6, 12.6
 *
 * Asserts that when the seeded four-plan list [free, basic, family, professional]
 * is passed to PlansTable, exactly four data rows are rendered in sort_order
 * ascending order.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PlansTable, SubscriptionPlan } from "../PlansTable";

// ---------------------------------------------------------------------------
// Seeded plan fixtures (sort_order 1–4)
// ---------------------------------------------------------------------------

const freePlan: SubscriptionPlan = {
  id: "plan-free",
  code: "free",
  name_vi: "Miễn phí",
  name_en: "Free",
  price_vnd: 0,
  billing_period: "monthly",
  is_recommended: false,
  is_active: true,
  sort_order: 1,
  description: "Free tier",
  features: [],
  limits: {},
};

const basicPlan: SubscriptionPlan = {
  id: "plan-basic",
  code: "basic",
  name_vi: "Cơ bản",
  name_en: "Basic",
  price_vnd: 99000,
  billing_period: "monthly",
  is_recommended: false,
  is_active: true,
  sort_order: 2,
  description: "Basic tier",
  features: [],
  limits: {},
};

const familyPlan: SubscriptionPlan = {
  id: "plan-family",
  code: "family",
  name_vi: "Gia đình",
  name_en: "Family",
  price_vnd: 199000,
  billing_period: "monthly",
  is_recommended: true,
  is_active: true,
  sort_order: 3,
  description: "Family tier",
  features: [],
  limits: {},
};

const professionalPlan: SubscriptionPlan = {
  id: "plan-professional",
  code: "professional",
  name_vi: "Chuyên nghiệp",
  name_en: "Professional",
  price_vnd: 399000,
  billing_period: "monthly",
  is_recommended: false,
  is_active: true,
  sort_order: 4,
  description: "Professional tier",
  features: [],
  limits: {},
};

const seededPlans: SubscriptionPlan[] = [
  freePlan,
  basicPlan,
  familyPlan,
  professionalPlan,
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PlansTable — seeded four-row rendering", () => {
  it("renders exactly 5 rows (1 header + 4 data rows) for the seeded plan list", () => {
    render(<PlansTable plans={seededPlans} onEdit={vi.fn()} />);

    // getAllByRole("row") returns all <tr> elements including the header row
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(5);
  });

  it("renders data rows in sort_order ascending order: free, basic, family, professional", () => {
    render(<PlansTable plans={seededPlans} onEdit={vi.fn()} />);

    const rows = screen.getAllByRole("row");
    // rows[0] is the header; rows[1..4] are data rows
    const dataRows = rows.slice(1);

    expect(dataRows).toHaveLength(4);

    // Each data row should contain the English name in the expected order
    expect(dataRows[0]).toHaveTextContent("Free");
    expect(dataRows[1]).toHaveTextContent("Basic");
    expect(dataRows[2]).toHaveTextContent("Family");
    expect(dataRows[3]).toHaveTextContent("Professional");
  });

  it("renders rows in sort_order ascending order even when plans are passed in reverse order", () => {
    const reversedPlans = [...seededPlans].reverse(); // professional, family, basic, free
    render(<PlansTable plans={reversedPlans} onEdit={vi.fn()} />);

    const rows = screen.getAllByRole("row");
    const dataRows = rows.slice(1);

    expect(dataRows).toHaveLength(4);

    // Should still be sorted by sort_order ascending
    expect(dataRows[0]).toHaveTextContent("Free");
    expect(dataRows[1]).toHaveTextContent("Basic");
    expect(dataRows[2]).toHaveTextContent("Family");
    expect(dataRows[3]).toHaveTextContent("Professional");
  });
});
