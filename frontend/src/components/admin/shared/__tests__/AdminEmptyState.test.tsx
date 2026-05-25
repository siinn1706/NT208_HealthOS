// AdminEmptyState.test.tsx — property-based tests for AdminEmptyState component
// Feature: admin-console, Property 31: Empty-state rendering with optional clear-filters
//
// **Validates: Requirements 10.6**

import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";
import { render, screen } from "@testing-library/react";

import { AdminEmptyState } from "../AdminEmptyState";

/**
 * Property 31: Empty-state rendering with optional clear-filters
 *
 * For any list endpoint response with zero items, the corresponding admin
 * page SHALL render the empty state with descriptive text. When any filter
 * is applied (`hasFilters === true` AND `onClearFilters` is provided), the
 * empty state SHALL include a clear-filters control; when no filter is
 * applied (or `onClearFilters` is absent), it SHALL NOT include that control.
 *
 * **Validates: Requirements 10.6**
 */
describe("Property 31: Empty-state rendering with optional clear-filters", () => {
  // ── Part A: descriptive text always renders ───────────────────────────────

  it("always renders the descriptive message regardless of filter state (fc.boolean × fc.boolean)", () => {
    // Feature: admin-console, Property 31: Empty-state rendering with optional clear-filters
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.boolean(), // hasFilters
        fc.boolean(), // whether onClearFilters is provided
        (message, hasFilters, provideCallback) => {
          const onClearFilters = provideCallback ? vi.fn() : undefined;
          const { container, unmount } = render(
            <AdminEmptyState
              message={message}
              hasFilters={hasFilters}
              onClearFilters={onClearFilters}
            />,
          );
          // Query within the rendered container to avoid cross-render pollution
          const result = container.querySelector("p") !== null &&
            container.textContent?.includes(message) === true;
          unmount();
          return result;
        },
      ),
      { numRuns: 100 },
    );
  });

  // ── Part B: clear-filters control renders iff hasFilters AND callback provided ──

  it("renders 'Clear filters' button iff hasFilters===true AND onClearFilters is a function", () => {
    // Feature: admin-console, Property 31: Empty-state rendering with optional clear-filters
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.boolean(), // hasFilters
        fc.boolean(), // whether onClearFilters is provided
        (message, hasFilters, provideCallback) => {
          const onClearFilters = provideCallback ? vi.fn() : undefined;
          const { container, unmount } = render(
            <AdminEmptyState
              message={message}
              hasFilters={hasFilters}
              onClearFilters={onClearFilters}
            />,
          );

          // Query within the rendered container to avoid cross-render pollution
          const clearButton = Array.from(container.querySelectorAll("button")).find(
            (btn) => /clear filters/i.test(btn.textContent ?? ""),
          );

          const shouldShow = hasFilters === true && typeof onClearFilters === "function";
          const result = shouldShow ? clearButton !== undefined : clearButton === undefined;
          unmount();
          return result;
        },
      ),
      { numRuns: 100 },
    );
  });

  // ── Part C: exhaustive example-based cases ────────────────────────────────

  describe("example-based cases", () => {
    it("renders message text when no filters are applied", () => {
      render(<AdminEmptyState message="No users found." />);
      expect(screen.getByText("No users found.")).toBeInTheDocument();
    });

    it("does NOT render 'Clear filters' when hasFilters is false and no callback", () => {
      render(<AdminEmptyState message="No results." hasFilters={false} />);
      expect(
        screen.queryByRole("button", { name: /clear filters/i }),
      ).not.toBeInTheDocument();
    });

    it("does NOT render 'Clear filters' when hasFilters is true but onClearFilters is absent", () => {
      render(<AdminEmptyState message="No results." hasFilters={true} />);
      expect(
        screen.queryByRole("button", { name: /clear filters/i }),
      ).not.toBeInTheDocument();
    });

    it("does NOT render 'Clear filters' when hasFilters is false even if onClearFilters is provided", () => {
      const onClearFilters = vi.fn();
      render(
        <AdminEmptyState
          message="No results."
          hasFilters={false}
          onClearFilters={onClearFilters}
        />,
      );
      expect(
        screen.queryByRole("button", { name: /clear filters/i }),
      ).not.toBeInTheDocument();
    });

    it("renders 'Clear filters' when hasFilters is true AND onClearFilters is provided", () => {
      const onClearFilters = vi.fn();
      render(
        <AdminEmptyState
          message="No results match your filters."
          hasFilters={true}
          onClearFilters={onClearFilters}
        />,
      );
      expect(
        screen.getByRole("button", { name: /clear filters/i }),
      ).toBeInTheDocument();
    });

    it("calls onClearFilters when the 'Clear filters' button is clicked", async () => {
      const onClearFilters = vi.fn();
      const { user } = await import("@testing-library/user-event").then(
        (m) => ({ user: m.default.setup() }),
      );
      render(
        <AdminEmptyState
          message="No results."
          hasFilters={true}
          onClearFilters={onClearFilters}
        />,
      );
      const btn = screen.getByRole("button", { name: /clear filters/i });
      await user.click(btn);
      expect(onClearFilters).toHaveBeenCalledTimes(1);
    });
  });
});
