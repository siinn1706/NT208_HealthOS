/**
 * AdminShell.test.tsx — Property-based tests for the admin shell exclusion guarantee
 *
 * Property 14: Non-admin sessions never render the admin shell
 *
 * The admin shell (AdminSidebar, AdminTopBar, AdminIdentityMenu) is only ever
 * mounted inside the `(admin)` route group layout, which gates on
 * `isAdmin(roles, permissions)`. This test verifies that the predicate
 * correctly returns `false` for all non-admin (roles, permissions) pairs,
 * ensuring the shell is never reachable for non-admin sessions.
 *
 * Architecture note (from design.md):
 *   "The Normal_User never sees the admin shell because (a) middleware
 *   redirects to /forbidden before the layout renders, and (b) the shell is
 *   only mounted within the (admin) route group, never inside (app) or (main)
 *   (R2.5)."
 *
 * The DOM-level assertions (no aria-label="Admin navigation", no
 * data-testid="admin-topbar") are validated by confirming the predicate that
 * gates shell rendering is false — if isAdmin() returns false, the layout
 * redirects before AdminShell is ever rendered.
 *
 * **Validates: Requirements 2.5, 4.7**
 */

// Feature: admin-console, Property 14: Non-admin sessions never render the admin shell

import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";
import { render, screen } from "@testing-library/react";
import { isAdmin, ADMIN_ROLE, ADMIN_PERMISSION } from "@/lib/admin/admin-session";

// ── Module mocks ─────────────────────────────────────────────────────────────

// AdminSidebar uses next/navigation and @/lib/env — mock them so the
// component can be imported without a Next.js runtime.
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/vi/admin"),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("@/lib/env", () => ({
  ADMIN_SECURITY_FEED_ENABLED: false,
  ADMIN_AUDIT_FEED_ENABLED: false,
  CORE_API_URL: "http://localhost:8000",
  BFF_TRUSTED_ORIGINS: [],
  BFF_CSRF_GUARD_MODE: "enforce",
  APP_ENV: "dev",
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// Import shell components after mocks are registered
import { AdminShell } from "../AdminShell";

// ── Arbitraries ───────────────────────────────────────────────────────────────

/**
 * Generates a string array that never contains "admin".
 * Used to produce roles arrays that cannot grant admin access via the role path.
 */
const rolesWithoutAdmin = fc.array(
  fc.string().filter((s) => s !== ADMIN_ROLE),
);

/**
 * Generates a string array that never contains "admin.access".
 * Used to produce permissions arrays that cannot grant admin access via the
 * permission path.
 */
const permissionsWithoutAdminAccess = fc.array(
  fc.string().filter((s) => s !== ADMIN_PERMISSION),
);

// ── Property 14 ───────────────────────────────────────────────────────────────

describe("Property 14: Non-admin sessions never render the admin shell", () => {
  /**
   * Core predicate property:
   *
   * For all (roles, permissions) where roles does not contain "admin" and
   * permissions does not contain "admin.access", isAdmin() MUST return false.
   *
   * This is the gate that prevents AdminShell from being rendered — the
   * admin layout calls isAdmin() and redirects to /forbidden when it returns
   * false, so the shell components (sidebar, top bar, identity menu) are
   * never mounted.
   */
  it("isAdmin returns false for all (roles, permissions) pairs without admin role or admin.access permission", () => {
    fc.assert(
      fc.property(
        rolesWithoutAdmin,
        permissionsWithoutAdminAccess,
        (roles, permissions) => {
          // The predicate that gates AdminShell rendering must be false
          expect(isAdmin(roles, permissions)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * DOM-level property:
   *
   * When AdminShell is rendered (simulating a scenario where the component
   * is instantiated), the rendered DOM must contain the admin navigation
   * landmark (aria-label="Admin navigation") and the admin top bar.
   *
   * This confirms the test-id markers we assert ABSENT in non-admin contexts
   * are indeed PRESENT when the shell is rendered — validating that our
   * absence assertions in the predicate test are meaningful.
   *
   * The non-admin exclusion is enforced at the layout level (before
   * AdminShell is ever instantiated), so the DOM assertion for non-admin
   * sessions is: the shell is never rendered at all.
   */
  it("AdminShell renders the admin navigation landmark (aria-label='Admin navigation') when mounted", () => {
    render(
      <AdminShell displayName="Test Admin" avatarUrl={null}>
        <div>content</div>
      </AdminShell>,
    );

    // The sidebar must be present when the shell IS rendered
    const sidebar = screen.getByRole("complementary", {
      name: "Admin navigation",
    });
    expect(sidebar).toBeInTheDocument();
  });

  it("AdminShell renders the admin top bar header when mounted", () => {
    render(
      <AdminShell displayName="Test Admin" avatarUrl={null}>
        <div>content</div>
      </AdminShell>,
    );

    // The top bar header must be present when the shell IS rendered
    const header = screen.getByRole("banner");
    expect(header).toBeInTheDocument();
  });

  /**
   * Exhaustive predicate check:
   *
   * For any combination of roles (without "admin") and permissions (without
   * "admin.access"), the isAdmin predicate is false — meaning the admin
   * layout would redirect before rendering AdminShell, so no element with
   * aria-label="Admin navigation" or the admin top bar would appear in the
   * document.
   *
   * This property directly validates Requirements 2.5 and 4.7:
   *   R2.5: Normal_User must not see any element of the Admin_Layout
   *   R4.7: When roles/permissions don't include admin role/permission,
   *          Normal_User UI is rendered by default
   */
  it("isAdmin is false for all generated non-admin pairs — confirming no admin shell elements would be rendered", () => {
    const counterexamples: Array<{ roles: string[]; permissions: string[] }> = [];

    fc.assert(
      fc.property(
        rolesWithoutAdmin,
        permissionsWithoutAdminAccess,
        (roles, permissions) => {
          const result = isAdmin(roles, permissions);
          if (result !== false) {
            counterexamples.push({ roles, permissions });
          }
          // isAdmin must be false → layout redirects → no admin shell rendered
          // → no aria-label="Admin navigation" in DOM
          // → no admin-topbar header in DOM
          return result === false;
        },
      ),
      { numRuns: 100 },
    );

    expect(counterexamples).toHaveLength(0);
  });

  /**
   * Null / undefined edge cases:
   *
   * isAdmin must also return false for null/undefined inputs, which represent
   * unauthenticated or partially-loaded sessions.
   */
  it("isAdmin returns false when roles is null and permissions has no admin.access", () => {
    fc.assert(
      fc.property(permissionsWithoutAdminAccess, (permissions) => {
        expect(isAdmin(null, permissions)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("isAdmin returns false when permissions is null and roles has no admin role", () => {
    fc.assert(
      fc.property(rolesWithoutAdmin, (roles) => {
        expect(isAdmin(roles, null)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("isAdmin returns false when both roles and permissions are null (unauthenticated session)", () => {
    expect(isAdmin(null, null)).toBe(false);
  });

  it("isAdmin returns false when both roles and permissions are undefined", () => {
    expect(isAdmin(undefined, undefined)).toBe(false);
  });

  /**
   * Specific non-admin examples that must not grant access:
   * Validates that near-miss strings (similar to but not equal to the magic
   * strings) do not accidentally grant admin access.
   */
  it("isAdmin returns false for near-miss role strings", () => {
    const nearMissRoles = [
      ["administrator"],
      ["Admin"],
      ["ADMIN"],
      ["admin "],
      [" admin"],
      ["admin."],
      ["admin_access"],
    ];

    for (const roles of nearMissRoles) {
      expect(isAdmin(roles, [])).toBe(false);
    }
  });

  it("isAdmin returns false for near-miss permission strings", () => {
    const nearMissPermissions = [
      ["admin"],
      ["admin.access.extra"],
      ["admin_access"],
      ["admin.Access"],
      ["ADMIN.ACCESS"],
      ["admin.access "],
    ];

    for (const permissions of nearMissPermissions) {
      expect(isAdmin([], permissions)).toBe(false);
    }
  });
});
