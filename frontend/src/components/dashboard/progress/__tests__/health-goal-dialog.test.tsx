import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntlWrapper } from "@/__tests__/test-utils";
import type { UserBmiData } from "@/data/gamification";
import { HealthGoalDialog } from "../HealthGoalDialog";

const saveHealthGoalActionMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock("../save-health-goal-action", () => ({
  saveHealthGoalAction: saveHealthGoalActionMock,
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
    success: vi.fn(),
  },
}));

const initialGoal: UserBmiData = {
  heightCm: 168,
  weightKg: 60,
  bmi: 21.3,
  status: "normal",
  bmiScore: 95,
  targetBmi: null,
  targetWeightKg: null,
  deadline: null,
  goalId: null,
};

describe("HealthGoalDialog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 31, 12, 0, 0));
    saveHealthGoalActionMock.mockReset();
    toastErrorMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets the deadline picker minimum to today", () => {
    render(
      <IntlWrapper>
        <HealthGoalDialog
          open
          onOpenChange={() => undefined}
          initialGoal={initialGoal}
        />
      </IntlWrapper>
    );

    expect(screen.getByLabelText("Ngày mục tiêu")).toHaveAttribute("min", "2026-05-31");
  });

  it("does not call Core when deadline is in the past", () => {
    render(
      <IntlWrapper>
        <HealthGoalDialog
          open
          onOpenChange={() => undefined}
          initialGoal={initialGoal}
        />
      </IntlWrapper>
    );

    fireEvent.change(screen.getByLabelText("Cân nặng mục tiêu (kg)"), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText("Ngày mục tiêu"), {
      target: { value: "2006-09-01" },
    });

    const form = screen.getByLabelText("Ngày mục tiêu").closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    expect(saveHealthGoalActionMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Chọn hôm nay hoặc một ngày trong tương lai cho mục tiêu."
    );
  });
});
