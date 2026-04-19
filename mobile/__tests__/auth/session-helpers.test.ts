/**
 * Validates the session helpers that decide where to route a user based on
 * the backend-supplied onboarding_status string enum.
 */
import { displayLabel, isOnboardingComplete, type SessionUser } from "@/auth/session";

const baseUser: SessionUser = {
  id: "u1",
  email: "user@example.com",
  display_name: "Test User",
  onboarding_status: "pending",
};

describe("isOnboardingComplete", () => {
  it("returns true only when status is exactly 'completed'", () => {
    expect(isOnboardingComplete({ ...baseUser, onboarding_status: "completed" })).toBe(true);
    expect(isOnboardingComplete({ ...baseUser, onboarding_status: "pending" })).toBe(false);
    expect(isOnboardingComplete({ ...baseUser, onboarding_status: "in_progress" })).toBe(false);
  });

  it("treats null/undefined as incomplete", () => {
    expect(isOnboardingComplete(null)).toBe(false);
    expect(isOnboardingComplete(undefined)).toBe(false);
  });
});

describe("displayLabel", () => {
  it("prefers full_name from /users/me when present", () => {
    const u = { ...baseUser, full_name: "Full Name", username: "user1" };
    expect(displayLabel(u)).toBe("Full Name");
  });

  it("falls back to display_name from /auth/me", () => {
    expect(displayLabel(baseUser)).toBe("Test User");
  });

  it("falls back to username then email", () => {
    const u = {
      ...baseUser,
      display_name: "",
      username: "user1",
    };
    expect(displayLabel(u)).toBe("user1");

    const u2 = { ...baseUser, display_name: "" } as SessionUser;
    expect(displayLabel(u2)).toBe("user@example.com");
  });

  it("returns empty string for null/undefined user", () => {
    expect(displayLabel(null)).toBe("");
    expect(displayLabel(undefined)).toBe("");
  });
});
