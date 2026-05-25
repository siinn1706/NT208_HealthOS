/**
 * AdminSidebar.test.tsx — example tests for the AdminSidebar component
 *
 * Tests:
 *   1. Sidebar label set + ordering (Requirements 2.1)
 *   2. Active-state visual class (Requirement 2.4)
 *   3. Layout-divergence assertion vs dashboard (Requirement 2.3)
 *
 * Mocks:
 *   - next/navigation  → controls usePathname()
 *   - @/lib/env        → controls feature flags
 *   - sonner           → silences toast side-effects
 *
 * **Validates: Requirements 2.1, 2.3, 2.4**
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Module mocks ─────────────────────────────────────────────────────────────

// Mock next/navigation so usePathname() is controllable
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/vi/admin"),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// Mock @/lib/env to control feature flags (both off by default)
vi.mock("@/lib/env", () => ({
  ADMIN_SECURITY_FEED_ENABLED: false,
  ADMIN_AUDIT_FEED_ENABLED: false,
  CORE_API_URL: "http://localhost:8000",
  BFF_TRUSTED_ORIGINS: [],
  BFF_CSRF_GUARD_MODE: "enforce",
  APP_ENV: "dev",
}));

// Silence sonner toasts in tests
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// Import after mocks are registered
import { usePathname } from "next/navigation";
import { AdminSidebar } from "../AdminSidebar";

// ── Helpers ───────────────────────────────────────────────────────────────────

function setPathname(pathname: string) {
  vi.mocked(usePathname).mockReturnValue(pathname);
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe("AdminSidebar", () => {
  beforeEach(() => {
    // Reset to a neutral admin path before each test
    setPathname("/vi/admin");
  });

  // ── Test 1: Sidebar label set + ordering ─────────────────────────────────

  describe("Test 1: Sidebar label set + ordering (Requirement 2.1)", () => {
    it("renders exactly the labels Overview, Users, Subscriptions in that order when feature flags are off", () => {
      render(<AdminSidebar />);

      // Collect all nav link text content in DOM order
      const links = screen.getAllByRole("link");
      const labels = links.map((link) => link.textContent?.trim()).filter(Boolean);

      // Must contain exactly these three labels (sidebar entry for subscriptions is "Plans")
      expect(labels).toContain("Overview");
      expect(labels).toContain("Users");
      expect(labels).toContain("Plans");

      // Security and Audit must NOT appear (feature flags are off)
      expect(labels).not.toContain("Security");
      expect(labels).not.toContain("Audit");

      // Verify ordering: Overview < Users < Plans
      const overviewIdx = labels.indexOf("Overview");
      const usersIdx = labels.indexOf("Users");
      const plansIdx = labels.indexOf("Plans");

      expect(overviewIdx).toBeLessThan(usersIdx);
      expect(usersIdx).toBeLessThan(plansIdx);
    });

    it("renders exactly 3 nav links when both feature flags are off", () => {
      render(<AdminSidebar />);
      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(3);
    });
  });

  // ── Test 2: Active-state visual class ────────────────────────────────────

  describe("Test 2: Active-state visual class (Requirement 2.4)", () => {
    it("applies border-l-2 class to the Overview link when pathname is /vi/admin", () => {
      setPathname("/vi/admin");
      render(<AdminSidebar />);

      const overviewLink = screen.getByRole("link", { name: /overview/i });
      expect(overviewLink).toHaveClass("border-l-2");
    });

    it("applies border-l-2 class to the Users link when pathname is /vi/admin/users", () => {
      setPathname("/vi/admin/users");
      render(<AdminSidebar />);

      const usersLink = screen.getByRole("link", { name: /users/i });
      expect(usersLink).toHaveClass("border-l-2");
    });

    it("applies border-l-2 class to the Plans link when pathname is /vi/admin/subscriptions", () => {
      setPathname("/vi/admin/subscriptions");
      render(<AdminSidebar />);

      const plansLink = screen.getByRole("link", { name: /plans/i });
      expect(plansLink).toHaveClass("border-l-2");
    });

    it("does NOT apply border-l-2 to inactive links when Overview is active", () => {
      setPathname("/vi/admin");
      render(<AdminSidebar />);

      const usersLink = screen.getByRole("link", { name: /users/i });
      const plansLink = screen.getByRole("link", { name: /plans/i });

      expect(usersLink).not.toHaveClass("border-l-2");
      expect(plansLink).not.toHaveClass("border-l-2");
    });

    it("sets aria-current='page' on the active link and not on inactive links", () => {
      setPathname("/vi/admin/users");
      render(<AdminSidebar />);

      const usersLink = screen.getByRole("link", { name: /users/i });
      const overviewLink = screen.getByRole("link", { name: /overview/i });

      expect(usersLink).toHaveAttribute("aria-current", "page");
      expect(overviewLink).not.toHaveAttribute("aria-current");
    });
  });

  // ── Test 3: Layout-divergence assertion vs dashboard ─────────────────────

  describe("Test 3: Layout-divergence vs dashboard layout (Requirement 2.3)", () => {
    it("uses --admin-sidebar-bg token on the aside element (not the dashboard --sidebar token)", () => {
      render(<AdminSidebar />);

      // The aside element should have the bg-[var(--admin-sidebar-bg)] class
      const aside = screen.getByRole("complementary"); // <aside> has implicit role "complementary"
      expect(aside.className).toContain("--admin-sidebar-bg");
    });

    it("uses --admin-header-height token in the logo/brand area (4rem, differs from dashboard h-14 = 3.5rem)", () => {
      render(<AdminSidebar />);

      // The brand area div uses h-[var(--admin-header-height)]
      // We verify the token is referenced in the rendered markup
      const { container } = render(<AdminSidebar />);
      const brandArea = container.querySelector('[class*="--admin-header-height"]');
      expect(brandArea).not.toBeNull();
    });

    it("admin sidebar background token differs from dashboard sidebar token", () => {
      // The admin sidebar uses --admin-sidebar-bg (#1A4474 in light mode)
      // The dashboard sidebar uses --sidebar (#FFFFFF in light mode)
      // These are structurally different CSS custom properties — verify the
      // admin sidebar does NOT reference the dashboard --sidebar token
      render(<AdminSidebar />);

      const aside = screen.getByRole("complementary");
      // Should reference admin token
      expect(aside.className).toContain("--admin-sidebar-bg");
      // Should NOT reference the dashboard sidebar token directly
      expect(aside.className).not.toMatch(/\bvar\(--sidebar\)\b/);
    });

    it("admin header height is 4rem (--admin-header-height), distinct from dashboard h-14 (3.5rem)", () => {
      // This is a structural assertion: the design doc specifies
      // --admin-header-height: 4rem vs dashboard h-14 (3.5rem / 56px).
      // We verify the token name used in the component differs from h-14.
      const { container } = render(<AdminSidebar />);

      // The brand area uses h-[var(--admin-header-height)], not h-14
      const brandArea = container.querySelector('[class*="admin-header-height"]');
      expect(brandArea).not.toBeNull();

      // Confirm h-14 is not used in the sidebar (dashboard uses h-14)
      const allElements = container.querySelectorAll('[class*="h-14"]');
      expect(allElements).toHaveLength(0);
    });
  });
});
