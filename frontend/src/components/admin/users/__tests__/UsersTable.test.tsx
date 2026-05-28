/**
 * UsersTable.test.tsx
 *
 * Feature: admin-console
 * Task 18.3 — Property test for Ban/Unban enable rules
 *
 * Property 22: Ban / Unban enable rules
 *   - Ban button is enabled iff row.status !== "banned" AND row.user_id !== sessionUserId
 *   - Unban button is enabled iff row.status === "banned"
 *
 * **Validates: Requirements 7.4, 7.7, 8.3**
 */

import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";
import { render, screen, fireEvent } from "@testing-library/react";

import { UsersTable, type UserRow } from "../UsersTable";
import { UserRowActions } from "../user-row-actions";

// ── Module mocks ──────────────────────────────────────────────────────────────

// UsersTable uses next/link — mock it so the component renders without a
// Next.js router context.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a minimal valid UserRow from the generated fields.
 * Fields not relevant to the property are given stable defaults.
 */
function makeRow(overrides: Partial<UserRow> & Pick<UserRow, "user_id" | "status">): UserRow {
  return {
    display_name: "Test User",
    email: "test@example.com",
    role: null,
    subscription: null,
    created_at: "2024-01-01T00:00:00Z",
    last_seen_at: null,
    ...overrides,
  };
}

/**
 * Render UserRowActions directly and open its dropdown, then return the
 * "Ban user" and "Unban user" menu items with disabled state helpers.
 *
 * We render UserRowActions directly (not through UsersTable) to avoid
 * portal-in-portal complexity in JSDOM.
 */
function renderAndGetButtons(row: UserRow, sessionUserId: string | null) {
  const isSelf = sessionUserId !== null && row.user_id === sessionUserId;
  const { unmount } = render(
    <UserRowActions
      userId={row.user_id}
      displayName={row.display_name}
      email={row.email}
      status={row.status}
      isSelf={isSelf}
      onBan={vi.fn()}
      onUnban={vi.fn()}
    />,
  );

  // Open the dropdown
  const trigger = screen.getByRole("button", { name: /actions for/i });
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
  fireEvent.click(trigger);

  // Radix renders menuitem elements in a portal appended to document.body
  const allItems = document.querySelectorAll('[role="menuitem"]');
  const banButton = Array.from(allItems).find((el) =>
    /ban user/i.test(el.textContent?.trim() ?? ""),
  );
  const unbanButton = Array.from(allItems).find((el) =>
    /unban user/i.test(el.textContent?.trim() ?? ""),
  );

  function isDisabled(el: Element | undefined): boolean {
    if (!el) return false;
    return el.hasAttribute("data-disabled") || el.getAttribute("aria-disabled") === "true";
  }

  return {
    banButton,
    unbanButton,
    isBanDisabled: () => isDisabled(banButton),
    isUnbanDisabled: () => isDisabled(unbanButton),
    unmount,
  };
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

/**
 * Generates a UserRow with arbitrary user_id and status.
 * Other fields are fixed to keep the test focused on the enable rules.
 */
const arbitraryRow = fc.record({
  user_id: fc.string({ minLength: 1, maxLength: 64 }),
  status: fc.string(),
  display_name: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
  email: fc.emailAddress(),
  role: fc.option(fc.string(), { nil: null }),
  subscription: fc.constant(null),
  created_at: fc.constant("2024-01-01T00:00:00Z"),
  last_seen_at: fc.constant(null),
});

/**
 * Generates a sessionUserId that is either null or an arbitrary string.
 */
const arbitrarySessionUserId = fc.option(
  fc.string({ minLength: 1, maxLength: 64 }),
  { nil: null },
);

// ── Property 22: Ban / Unban enable rules ─────────────────────────────────────

describe("Property 22: Ban / Unban enable rules", () => {
  /**
   * Ban button is enabled iff:
   *   row.status !== "banned"  (R7.4)
   *   AND row.user_id !== sessionUserId  (R7.7)
   *
   * **Validates: Requirements 7.4, 7.7, 8.3**
   */
  it("Ban button is enabled iff status !== 'banned' AND user_id !== sessionUserId", () => {
    fc.assert(
      fc.property(arbitraryRow, arbitrarySessionUserId, (row, sessionUserId) => {
        const expectedCanBan =
          row.status !== "banned" && row.user_id !== sessionUserId;

        const { banButton, isBanDisabled, unmount } = renderAndGetButtons(row, sessionUserId);

        if (!banButton) {
          unmount();
          throw new Error("Ban button not found in rendered output");
        }

        const result = isBanDisabled() === !expectedCanBan;

        unmount();
        return result;
      }),
      { numRuns: 25 },
    );
  });

  /**
   * Unban button is enabled iff row.status === "banned" (R7.4).
   *
   * **Validates: Requirements 7.4, 8.3**
   */
  it("Unban button is enabled iff status === 'banned'", () => {
    fc.assert(
      fc.property(arbitraryRow, arbitrarySessionUserId, (row, sessionUserId) => {
        const expectedCanUnban = row.status === "banned";

        const { unbanButton, isUnbanDisabled, unmount } = renderAndGetButtons(row, sessionUserId);

        if (!unbanButton) {
          unmount();
          throw new Error("Unban button not found in rendered output");
        }

        const result = isUnbanDisabled() === !expectedCanUnban;

        unmount();
        return result;
      }),
      { numRuns: 25 },
    );
  });

  /**
   * Both properties hold simultaneously for the same (row, sessionUserId) pair.
   *
   * **Validates: Requirements 7.4, 7.7, 8.3**
   */
  it("Ban and Unban enable rules hold simultaneously for any (row, sessionUserId)", () => {
    fc.assert(
      fc.property(arbitraryRow, arbitrarySessionUserId, (row, sessionUserId) => {
        const expectedCanBan =
          row.status !== "banned" && row.user_id !== sessionUserId;
        const expectedCanUnban = row.status === "banned";

        const { banButton, unbanButton, isBanDisabled, isUnbanDisabled, unmount } = renderAndGetButtons(
          row,
          sessionUserId,
        );

        if (!banButton || !unbanButton) {
          unmount();
          throw new Error("Ban or Unban button not found in rendered output");
        }

        const banOk = isBanDisabled() === !expectedCanBan;
        const unbanOk = isUnbanDisabled() === !expectedCanUnban;

        unmount();
        return banOk && unbanOk;
      }),
      { numRuns: 25 },
    );
  });

  // ── Exhaustive examples for key boundary cases ────────────────────────────

  describe("exhaustive examples", () => {
    it("Ban disabled when status === 'banned' (already banned)", () => {
      const row = makeRow({ user_id: "user-1", status: "banned" });
      const { banButton, isBanDisabled, unmount } = renderAndGetButtons(row, "admin-1");
      expect(banButton).toBeDefined();
      expect(isBanDisabled()).toBe(true);
      unmount();
    });

    it("Ban disabled when user_id === sessionUserId (self-ban guard)", () => {
      const row = makeRow({ user_id: "admin-1", status: "active" });
      const { banButton, isBanDisabled, unmount } = renderAndGetButtons(row, "admin-1");
      expect(banButton).toBeDefined();
      expect(isBanDisabled()).toBe(true);
      unmount();
    });

    it("Ban enabled when status === 'active' AND user_id !== sessionUserId", () => {
      const row = makeRow({ user_id: "user-1", status: "active" });
      const { banButton, isBanDisabled, unmount } = renderAndGetButtons(row, "admin-1");
      expect(banButton).toBeDefined();
      expect(isBanDisabled()).toBe(false);
      unmount();
    });

    it("Ban enabled when status === 'deleted' AND user_id !== sessionUserId", () => {
      const row = makeRow({ user_id: "user-1", status: "deleted" });
      const { banButton, isBanDisabled, unmount } = renderAndGetButtons(row, "admin-1");
      expect(banButton).toBeDefined();
      expect(isBanDisabled()).toBe(false);
      unmount();
    });

    it("Ban enabled when sessionUserId is null (no self-ban risk)", () => {
      const row = makeRow({ user_id: "user-1", status: "active" });
      const { banButton, isBanDisabled, unmount } = renderAndGetButtons(row, null);
      expect(banButton).toBeDefined();
      expect(isBanDisabled()).toBe(false);
      unmount();
    });

    it("Unban enabled when status === 'banned'", () => {
      const row = makeRow({ user_id: "user-1", status: "banned" });
      const { unbanButton, isUnbanDisabled, unmount } = renderAndGetButtons(row, "admin-1");
      expect(unbanButton).toBeDefined();
      expect(isUnbanDisabled()).toBe(false);
      unmount();
    });

    it("Unban disabled when status === 'active'", () => {
      const row = makeRow({ user_id: "user-1", status: "active" });
      const { unbanButton, isUnbanDisabled, unmount } = renderAndGetButtons(row, "admin-1");
      expect(unbanButton).toBeDefined();
      expect(isUnbanDisabled()).toBe(true);
      unmount();
    });

    it("Unban disabled when status === 'deleted'", () => {
      const row = makeRow({ user_id: "user-1", status: "deleted" });
      const { unbanButton, isUnbanDisabled, unmount } = renderAndGetButtons(row, "admin-1");
      expect(unbanButton).toBeDefined();
      expect(isUnbanDisabled()).toBe(true);
      unmount();
    });

    it("Unban disabled when status is an unknown string", () => {
      const row = makeRow({ user_id: "user-1", status: "suspended" });
      const { unbanButton, isUnbanDisabled, unmount } = renderAndGetButtons(row, "admin-1");
      expect(unbanButton).toBeDefined();
      expect(isUnbanDisabled()).toBe(true);
      unmount();
    });

    it("Ban disabled AND Unban enabled when status === 'banned' (mutual exclusion)", () => {
      const row = makeRow({ user_id: "user-1", status: "banned" });
      const { banButton, unbanButton, isBanDisabled, isUnbanDisabled, unmount } = renderAndGetButtons(row, "admin-1");
      expect(banButton).toBeDefined();
      expect(unbanButton).toBeDefined();
      expect(isBanDisabled()).toBe(true);
      expect(isUnbanDisabled()).toBe(false);
      unmount();
    });

    it("Ban enabled AND Unban disabled when status === 'active' and not self", () => {
      const row = makeRow({ user_id: "user-1", status: "active" });
      const { banButton, unbanButton, isBanDisabled, isUnbanDisabled, unmount } = renderAndGetButtons(row, "admin-1");
      expect(banButton).toBeDefined();
      expect(unbanButton).toBeDefined();
      expect(isBanDisabled()).toBe(false);
      expect(isUnbanDisabled()).toBe(true);
      unmount();
    });
  });
});
