/**
 * current-subscription-card.test.tsx
 *
 * Tests the CurrentSubscriptionCard renders correctly for null,
 * active, and other subscription states.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CurrentSubscriptionCard } from "../current-subscription-card";
import type { UserSubscription } from "../ProfileSection";

// next-intl is globally mocked via setup-vitest.ts

describe("CurrentSubscriptionCard", () => {
  it("renders empty state when subscription is null", () => {
    render(<CurrentSubscriptionCard subscription={null} />);
    expect(screen.getByText(/no subscription/i)).toBeInTheDocument();
  });

  it("renders plan badge when subscription has a plan_code", () => {
    const sub: UserSubscription = { plan_code: "basic", status: "active" };
    render(<CurrentSubscriptionCard subscription={sub} />);
    // PlanBadge renders the i18n label or code; the element should be in the DOM
    expect(screen.getByText(/basic/i)).toBeInTheDocument();
  });

  it("renders status pill text", () => {
    const sub: UserSubscription = { plan_code: "free", status: "canceled" };
    render(<CurrentSubscriptionCard subscription={sub} />);
    expect(screen.getByText("canceled")).toBeInTheDocument();
  });

  it("renders expires_at time element when expiry is present", () => {
    const sub: UserSubscription = {
      plan_code: "professional",
      status: "active",
      expires_at: "2099-01-01T00:00:00.000Z",
    };
    render(<CurrentSubscriptionCard subscription={sub} />);
    const time = document.querySelector("time");
    expect(time).not.toBeNull();
    expect(time?.getAttribute("dateTime")).toBe("2099-01-01T00:00:00.000Z");
  });

  it("does NOT render time element when expires_at is absent", () => {
    const sub: UserSubscription = { plan_code: "free", status: "active" };
    render(<CurrentSubscriptionCard subscription={sub} />);
    expect(document.querySelector("time")).toBeNull();
  });

  it("renders admin_note when present", () => {
    const sub: UserSubscription = {
      plan_code: "basic",
      status: "active",
      admin_note: "VIP customer — handle with care",
    };
    render(<CurrentSubscriptionCard subscription={sub} />);
    expect(screen.getByText("VIP customer — handle with care")).toBeInTheDocument();
  });

  it("does NOT render admin_note paragraph when absent", () => {
    const sub: UserSubscription = { plan_code: "basic", status: "active" };
    const { container } = render(<CurrentSubscriptionCard subscription={sub} />);
    // Should be only 1 <p> element (the section heading)
    const paras = container.querySelectorAll("p");
    expect(paras).toHaveLength(1);
  });
});
