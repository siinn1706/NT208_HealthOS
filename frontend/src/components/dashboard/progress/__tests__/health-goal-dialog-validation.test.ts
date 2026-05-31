import { describe, expect, it } from "vitest";
import {
  getLocalDateInputValue,
  validateHealthGoalForm,
} from "../health-goal-dialog-validation";

describe("health goal dialog validation", () => {
  it("formats local dates for date inputs without UTC conversion", () => {
    expect(getLocalDateInputValue(new Date(2026, 4, 31))).toBe("2026-05-31");
  });

  it("rejects missing target weight before the request reaches Core", () => {
    expect(
      validateHealthGoalForm({ targetWeightKg: "", deadline: "" }, "2026-05-31")
    ).toEqual({ ok: false, messageKey: "targetWeightRequired" });
  });

  it("rejects target weights outside the Core API range", () => {
    expect(
      validateHealthGoalForm({ targetWeightKg: "20", deadline: "" }, "2026-05-31")
    ).toEqual({ ok: false, messageKey: "targetWeightRange" });
  });

  it("rejects past deadlines before the request reaches Core", () => {
    expect(
      validateHealthGoalForm({ targetWeightKg: "50", deadline: "2006-09-01" }, "2026-05-31")
    ).toEqual({ ok: false, messageKey: "deadlineMustBeTodayOrFuture" });
  });

  it("builds the Core payload for valid BMI goals", () => {
    expect(
      validateHealthGoalForm({ targetWeightKg: "50", deadline: "2026-06-01" }, "2026-05-31")
    ).toEqual({
      ok: true,
      payload: {
        target_weight_kg: 50,
        deadline: "2026-06-01",
      },
    });
  });
});
