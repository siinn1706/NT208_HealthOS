import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdherenceRing } from "@/components/dashboard/medications/AdherenceRing";
import { IntlWrapper } from "@/__tests__/test-utils";

// Wrap every render in the IntlWrapper so the new `next-intl` aria-label keys
// resolve. `IntlWrapper` ships the `vi` locale by default — assertions match
// the Vietnamese strings in `messages/vi.json::dashboard.medications.detail.adherence`.

describe("AdherenceRing", () => {
  it("renders an em-dash when there's no data", () => {
    render(<AdherenceRing adherence={null} />, { wrapper: IntlWrapper });
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(
      /chưa có dữ liệu/i,
    );
  });

  it("renders an em-dash when scheduled is zero", () => {
    render(
      <AdherenceRing
        adherence={{
          period_days: 7,
          scheduled: 0,
          taken: 0,
          skipped: 0,
          missed: 0,
          snoozed_pending: 0,
          pending: 0,
          percent: 0,
        }}
      />,
      { wrapper: IntlWrapper },
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders the percent and ARIA summary when there's data", () => {
    render(
      <AdherenceRing
        adherence={{
          period_days: 7,
          scheduled: 10,
          taken: 5,
          skipped: 1,
          missed: 4,
          snoozed_pending: 0,
          pending: 0,
          percent: 50,
        }}
      />,
      { wrapper: IntlWrapper },
    );
    expect(screen.getByText("50%")).toBeInTheDocument();
    // Vietnamese template: "Tuân thủ: {percent}% — đã uống {taken} trong {scheduled}"
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(
      /50%.*5.*10/,
    );
  });

  it("clamps percent into 0..100", () => {
    render(
      <AdherenceRing
        adherence={{
          period_days: 7,
          scheduled: 1,
          taken: 1,
          skipped: 0,
          missed: 0,
          snoozed_pending: 0,
          pending: 0,
          percent: 105,
        }}
      />,
      { wrapper: IntlWrapper },
    );
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});
