import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IntlWrapper } from "@/__tests__/test-utils";
import { TodayInsightCard } from "../TodayInsightCard";

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
}));

describe("TodayInsightCard", () => {
  it("renders as one full-width block card", () => {
    const { container } = render(
      <IntlWrapper>
        <TodayInsightCard series={[]} targetBmi={22} nowIso="2026-05-30T00:00:00.000Z" />
      </IntlWrapper>
    );

    const card = container.querySelector("output[data-insight-kind]");

    expect(card).toBeInTheDocument();
    expect(card).toHaveClass("block", "w-full");
    expect(card).toHaveAttribute("aria-live", "polite");
  });
});
