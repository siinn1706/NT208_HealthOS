import { describe, expect, it } from "vitest";
import { extractHealthGoalErrorMessage } from "../health-goal-action-contract";

describe("extractHealthGoalErrorMessage", () => {
  it("reads FastAPI validation detail messages instead of falling back to status text", () => {
    expect(
      extractHealthGoalErrorMessage(
        {
          detail: [
            {
              msg: "Deadline must be today or in the future",
            },
          ],
        },
        "Error 422"
      )
    ).toBe("Deadline must be today or in the future");
  });

  it("preserves BFF error.message responses", () => {
    expect(
      extractHealthGoalErrorMessage(
        {
          error: {
            message: "No active session.",
          },
        },
        "Error 401"
      )
    ).toBe("No active session.");
  });
});
