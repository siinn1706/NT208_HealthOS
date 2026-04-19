/**
 * MissingDataBanner — completeness nudge rendering tests (T-14).
 *
 * The banner has three states:
 *   1. No nudges → green "complete" pill.
 *   2. Critical nudges present → red header + listed nudges.
 *   3. Recommended-only → amber header + listed nudges.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { MissingDataBanner } from "@/components/dashboard/emergency-card/MissingDataBanner";
import type { CompletenessNudge } from "@/lib/emergency-card-types";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, vars?: Record<string, unknown>) => {
    if (vars && Object.keys(vars).length > 0) {
      return `${key}:${JSON.stringify(vars)}`;
    }
    return key;
  },
}));

describe("MissingDataBanner", () => {
  it("renders complete state when no nudges", () => {
    render(<MissingDataBanner nudges={[]} completenessScore={100} />);
    expect(screen.getByText("complete")).toBeInTheDocument();
    // The completeness body interpolates the score.
    expect(
      screen.getByText((c) => c.startsWith("completeBody:") && c.includes("100"))
    ).toBeInTheDocument();
  });

  it("renders critical header when critical nudges present", () => {
    const nudges: CompletenessNudge[] = [
      {
        field: "blood_type",
        level: "critical",
        message_key: "missingBloodType",
        fix_path: "/dashboard/profile?focus=blood_type",
      },
      {
        field: "emergency_contacts",
        level: "critical",
        message_key: "missingEmergencyContacts",
        fix_path: "/dashboard/profile?focus=emergency_contacts",
      },
    ];
    render(<MissingDataBanner nudges={nudges} completenessScore={50} />);
    // The critical header references the count.
    expect(
      screen.getByText((c) => c.startsWith("criticalHeader:") && c.includes('"n":2'))
    ).toBeInTheDocument();
    // The "complete" green state must NOT show.
    expect(screen.queryByText("complete")).not.toBeInTheDocument();
  });

  it("renders recommended-only state when no critical nudges", () => {
    const nudges: CompletenessNudge[] = [
      {
        field: "chronic_conditions",
        level: "recommended",
        message_key: "missingConditions",
        fix_path: "/dashboard/profile?focus=chronic_conditions",
      },
    ];
    render(<MissingDataBanner nudges={nudges} completenessScore={90} />);
    expect(
      screen.getByText((c) => c.startsWith("recommendedHeader:") && c.includes('"n":1'))
    ).toBeInTheDocument();
  });

  it("renders nudge fix links with locale prefix", () => {
    const nudges: CompletenessNudge[] = [
      {
        field: "blood_type",
        level: "critical",
        message_key: "missingBloodType",
        fix_path: "/dashboard/profile?focus=blood_type",
      },
    ];
    render(<MissingDataBanner nudges={nudges} completenessScore={50} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe(
      "/en/dashboard/profile?focus=blood_type"
    );
  });
});
