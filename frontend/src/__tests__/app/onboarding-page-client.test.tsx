import React from "react";
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const routerReplace = vi.fn();
const routerPush = vi.fn();
const track = vi.fn();

vi.mock("@/navigation", () => ({
  useRouter: () => ({
    replace: routerReplace,
    push: routerPush,
  }),
  usePathname: () => "/onboarding",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/vi/onboarding",
  useSearchParams: () =>
    new URLSearchParams([
      ["fbclid", "test-click"],
    ]),
}));

vi.mock("next-intl", () => ({
  useTranslations: () =>
    (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${JSON.stringify(vars)}` : key,
}));

vi.mock("@/hooks/use-notification", () => ({
  useNotification: () => ({
    handleApiError: vi.fn(() => ({})),
    success: vi.fn(),
    handleError: vi.fn(() => ({})),
  }),
}));

vi.mock("@/hooks/useOnboardingDraft", () => ({
  useOnboardingDraft: () => ({
    data: {},
    hydrated: true,
    setData: vi.fn(),
    flush: vi.fn(),
    clear: vi.fn(),
    status: "idle",
    lastSavedAt: null,
    lastError: null,
  }),
}));

vi.mock("@/lib/analytics", () => ({
  track: (...args: unknown[]) => track(...args),
}));

vi.mock("@/components/onboarding/OnboardingStep1", () => ({
  OnboardingStep1: () => <div>step-1</div>,
}));
vi.mock("@/components/onboarding/OnboardingStep2", () => ({
  OnboardingStep2: () => <div>step-2</div>,
}));
vi.mock("@/components/onboarding/OnboardingStep3", () => ({
  OnboardingStep3: () => <div>step-3</div>,
}));
vi.mock("@/components/onboarding/OnboardingStep4", () => ({
  OnboardingStep4: () => <div>step-4</div>,
}));
vi.mock("@/components/onboarding/OnboardingStep5", () => ({
  OnboardingStep5: () => <div>step-5</div>,
}));
vi.mock("@/components/onboarding/OnboardingWelcome", () => ({
  OnboardingWelcome: () => <div>welcome</div>,
}));
vi.mock("@/components/onboarding/OnboardingReview", () => ({
  OnboardingReview: () => <div>review</div>,
}));
vi.mock("@/components/shared/page", () => ({
  Stepper: () => <div>stepper</div>,
}));
vi.mock("@/components/shared/state", () => ({
  InlineNotice: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

import OnboardingPageClient from "@/app/[locale]/onboarding/OnboardingPageClient";

describe("OnboardingPageClient", () => {
  beforeEach(() => {
    routerReplace.mockReset();
    routerPush.mockReset();
    track.mockReset();
  });

  it("syncs the step query with an internal pathname so locale is not duplicated", async () => {
    render(<OnboardingPageClient />);

    await waitFor(() => {
      expect(routerReplace).toHaveBeenCalledWith(
        "/onboarding?fbclid=test-click&step=0",
        { scroll: false },
      );
    });

    expect(routerReplace).not.toHaveBeenCalledWith(
      "/vi/onboarding?fbclid=test-click&step=0",
      { scroll: false },
    );
  });
});
