import { describe, expect, it } from "vitest";
import { resolvePostLoginRedirectPath } from "@/lib/auth-post-login-redirect";

describe("resolvePostLoginRedirectPath", () => {
  it("sends admin sessions to admin regardless of dashboard from path", () => {
    expect(
      resolvePostLoginRedirectPath({
        isAdmin: true,
        onboardingStatus: "completed",
        fromRaw: "/vi/dashboard/settings",
      }),
    ).toBe("/admin");
  });

  it("keeps completed normal users on a safe dashboard from path", () => {
    expect(
      resolvePostLoginRedirectPath({
        isAdmin: false,
        onboardingStatus: "completed",
        fromRaw: "/vi/dashboard/settings",
      }),
    ).toBe("/vi/dashboard/settings");
  });

  it("sends completed normal users without a safe from path to dashboard", () => {
    expect(
      resolvePostLoginRedirectPath({
        isAdmin: false,
        onboardingStatus: "completed",
        fromRaw: "/vi/admin",
      }),
    ).toBe("/dashboard");
  });

  it("sends incomplete normal users to onboarding", () => {
    expect(
      resolvePostLoginRedirectPath({
        isAdmin: false,
        onboardingStatus: "pending",
        fromRaw: null,
      }),
    ).toBe("/onboarding");
  });
});
