/**
 * OverviewCards.test.tsx — property-based tests for OverviewCards and RecentEventsPanel
 *
 * Feature: admin-console, Property 20: Recommended-plan and recent-events conditional rendering
 *
 * **Validates: Requirements 6.2, 6.3**
 *
 * Property 20:
 *   For any overview API response `r`:
 *   - The recommended-plan card SHALL render iff `r.recommended_plan` is
 *     present AND its label length is in [1, 80].
 *   - The recent events panel SHALL render at most min(20, r.recent_events.length)
 *     entries, with each entry's `type` truncated to at most 64 characters and
 *     each entry's `at` rendered in ISO 8601.
 */

// Feature: admin-console, Property 20: Recommended-plan and recent-events conditional rendering

import { describe, it, expect, beforeEach } from "vitest";
import { vi } from "vitest";
import * as fc from "fast-check";
import { render, screen, cleanup, within } from "@testing-library/react";

import { OverviewCards } from "../OverviewCards";
import type { OverviewData } from "../OverviewCards";
import { RecentEventsPanel } from "../RecentEventsPanel";

// ── Mock next-intl ────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({ useLocale: () => "vi" }));

// ── Arbitraries ───────────────────────────────────────────────────────────────

/** Generates a valid OverviewData base (without recommended_plan / recent_events). */
const baseDataArb = fc.record({
  total_accounts: fc.integer({ min: 0, max: 9_999_999_999 }),
  active_users: fc.integer({ min: 0, max: 9_999_999_999 }),
  banned_users: fc.integer({ min: 0, max: 9_999_999_999 }),
  online_users: fc.integer({ min: 0, max: 9_999_999_999 }),
  total_plans: fc.integer({ min: 0, max: 9_999_999_999 }),
  active_subscriptions: fc.integer({ min: 0, max: 9_999_999_999 }),
});

/**
 * Generates an OverviewData with an optional recommended_plan.
 * Uses fc.option to produce undefined (absent) or a record with code + label.
 */
const overviewDataArb = fc
  .tuple(
    baseDataArb,
    fc.option(
      fc.record({
        code: fc.constantFrom<"free" | "basic" | "family" | "professional">("free", "basic", "family", "professional"),
        label: fc.string({ minLength: 0, maxLength: 100 }),
      }),
    ),
  )
  .map(([base, recPlan]) => ({
    ...base,
    ...(recPlan !== null ? { recommended_plan: recPlan } : {}),
  }));

/** Generates a single recent event. */
const recentEventArb = fc.record({
  at: fc
    .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
    .map((d) => d.toISOString()),
  type: fc.string({ minLength: 0, maxLength: 120 }),
  summary: fc.option(fc.string({ minLength: 1, maxLength: 200 })).map((v) =>
    v === null ? undefined : v,
  ),
});

/** Generates an array of 0–40 recent events. */
const recentEventsArb = fc.array(recentEventArb, { minLength: 0, maxLength: 40 });

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Renders OverviewCards with the given data (not loading, no error). */
function renderOverviewCards(data: OverviewData) {
  return render(<OverviewCards data={data} isLoading={false} />);
}

/** Renders RecentEventsPanel with the given events array. */
function renderRecentEventsPanel(events: Array<{ at: string; type: string; summary?: string }> | null) {
  return render(<RecentEventsPanel events={events} isLoading={false} />);
}

// ── Property 20 ───────────────────────────────────────────────────────────────

describe("Property 20: Recommended-plan and recent-events conditional rendering", () => {
  beforeEach(() => {
    cleanup();
  });

  // ── Part A: Recommended-plan card (Requirement 6.2) ───────────────────────

  describe("Part A: Recommended-plan card renders iff label.length ∈ [1, 80] (Requirement 6.2)", () => {
    /**
     * For any overview data where recommended_plan is present and
     * label.length ∈ [1, 80], the recommended-plan card SHALL be rendered.
     */
    it("renders recommended-plan card when recommended_plan is present and label.length ∈ [1, 80]", () => {
      // Feature: admin-console, Property 20: Recommended-plan and recent-events conditional rendering
      fc.assert(
        fc.property(
          baseDataArb,
          fc.record({
            code: fc.constantFrom<"free" | "basic" | "family" | "professional">("free", "basic", "family", "professional"),
            label: fc.string({ minLength: 1, maxLength: 80 }),
          }),
          (base, recPlan) => {
            cleanup();
            const data: OverviewData = { ...base, recommended_plan: recPlan };
            renderOverviewCards(data);

            // The recommended-plan card should be present — check for the heading
            const heading = screen.queryByText("Recommended Plan");
            cleanup();
            return heading !== null;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For any overview data where recommended_plan is absent, the
     * recommended-plan card SHALL NOT be rendered.
     */
    it("does NOT render recommended-plan card when recommended_plan is absent", () => {
      // Feature: admin-console, Property 20: Recommended-plan and recent-events conditional rendering
      fc.assert(
        fc.property(baseDataArb, (base) => {
          cleanup();
          // No recommended_plan field
          const data: OverviewData = { ...base };
          renderOverviewCards(data);

          const heading = screen.queryByText("Recommended Plan");
          cleanup();
          return heading === null;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * For any overview data where recommended_plan is present but
     * label.length === 0, the recommended-plan card SHALL NOT be rendered.
     */
    it("does NOT render recommended-plan card when label is empty (length === 0)", () => {
      // Feature: admin-console, Property 20: Recommended-plan and recent-events conditional rendering
      fc.assert(
        fc.property(
          baseDataArb,
          fc.string({ minLength: 1, maxLength: 20 }),
          (base, code) => {
            cleanup();
            const data: OverviewData = {
              ...base,
              recommended_plan: { code: code as never, label: "" },
            };
            renderOverviewCards(data);

            const heading = screen.queryByText("Recommended Plan");
            cleanup();
            return heading === null;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For any overview data where recommended_plan is present but
     * label.length > 80, the recommended-plan card SHALL NOT be rendered.
     */
    it("does NOT render recommended-plan card when label.length > 80", () => {
      // Feature: admin-console, Property 20: Recommended-plan and recent-events conditional rendering
      fc.assert(
        fc.property(
          baseDataArb,
          fc.record({
            code: fc.constantFrom<"free" | "basic" | "family" | "professional">("free", "basic", "family", "professional"),
            label: fc.string({ minLength: 81, maxLength: 200 }),
          }),
          (base, recPlan) => {
            cleanup();
            const data: OverviewData = { ...base, recommended_plan: recPlan };
            renderOverviewCards(data);

            const heading = screen.queryByText("Recommended Plan");
            cleanup();
            return heading === null;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Combined property: for any overview data, the recommended-plan card
     * renders iff recommended_plan is present AND label.length ∈ [1, 80].
     */
    it("recommended-plan card renders iff recommended_plan present AND label.length ∈ [1, 80]", () => {
      // Feature: admin-console, Property 20: Recommended-plan and recent-events conditional rendering
      fc.assert(
        fc.property(overviewDataArb, (data) => {
          cleanup();
          renderOverviewCards(data);

          const recPlan = data.recommended_plan;
          const shouldRender =
            recPlan !== undefined &&
            recPlan.label.length >= 1 &&
            recPlan.label.length <= 80;

          const heading = screen.queryByText("Recommended Plan");
          const isRendered = heading !== null;
          cleanup();

          return isRendered === shouldRender;
        }),
        { numRuns: 100 },
      );
    });
  });

  // ── Part B: Recent events panel (Requirement 6.3) ─────────────────────────

  describe("Part B: Recent events panel renders ≤ min(20, length) entries (Requirement 6.3)", () => {
    /**
     * For any array of events, the panel SHALL render at most
     * min(20, events.length) list items.
     */
    it("renders at most min(20, events.length) entries for any events array", () => {
      // Feature: admin-console, Property 20: Recommended-plan and recent-events conditional rendering
      fc.assert(
        fc.property(recentEventsArb, (events) => {
          cleanup();
          renderRecentEventsPanel(events);

          const list = screen.queryByRole("list", { name: /recent events list/i });
          if (events.length === 0) {
            // Empty state: no list items expected
            cleanup();
            return true;
          }

          const expectedCount = Math.min(20, events.length);
          const items = list ? within(list).getAllByRole("listitem") : [];
          cleanup();
          return items.length === expectedCount;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * For any array of events, each rendered entry's type SHALL be truncated
     * to at most 64 characters.
     */
    it("each rendered entry type is truncated to at most 64 characters", () => {
      // Feature: admin-console, Property 20: Recommended-plan and recent-events conditional rendering
      fc.assert(
        fc.property(recentEventsArb, (events) => {
          cleanup();
          if (events.length === 0) return true;

          renderRecentEventsPanel(events);

          const list = screen.queryByRole("list", { name: /recent events list/i });
          if (!list) {
            cleanup();
            return true;
          }

          const items = within(list).getAllByRole("listitem");
          const visible = events.slice(0, 20);

          const allTruncated = items.every((item, idx) => {
            const event = visible[idx];
            if (!event) return true;
            const expectedType = event.type.slice(0, 64);
            return item.textContent?.includes(expectedType) ?? false;
          });

          cleanup();
          return allTruncated;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * For any array of events, each rendered entry's `at` timestamp SHALL
     * appear in the DOM as an ISO 8601 string (the raw value from the API).
     */
    it("each rendered entry timestamp is rendered as ISO 8601", () => {
      // Feature: admin-console, Property 20: Recommended-plan and recent-events conditional rendering
      fc.assert(
        fc.property(recentEventsArb, (events) => {
          cleanup();
          if (events.length === 0) return true;

          renderRecentEventsPanel(events);

          const list = screen.queryByRole("list", { name: /recent events list/i });
          if (!list) {
            cleanup();
            return true;
          }

          const items = within(list).getAllByRole("listitem");
          const visible = events.slice(0, 20);

          // Each item should contain the ISO 8601 timestamp from the event
          const allHaveTimestamp = items.every((item, idx) => {
            const event = visible[idx];
            if (!event) return true;
            return item.textContent?.includes(event.at) ?? false;
          });

          cleanup();
          return allHaveTimestamp;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * When events is null, the panel SHALL NOT be rendered.
     */
    it("does NOT render the panel when events is null", () => {
      // Feature: admin-console, Property 20: Recommended-plan and recent-events conditional rendering
      cleanup();
      renderRecentEventsPanel(null);
      const panel = screen.queryByRole("list", { name: /recent events/i });
      expect(panel).toBeNull();
      cleanup();
    });

    /**
     * When events array has more than 20 entries, exactly 20 are rendered.
     */
    it("renders exactly 20 entries when events.length > 20", () => {
      // Feature: admin-console, Property 20: Recommended-plan and recent-events conditional rendering
      fc.assert(
        fc.property(
          fc.array(recentEventArb, { minLength: 21, maxLength: 40 }),
          (events) => {
            cleanup();
            renderRecentEventsPanel(events);

            const list = screen.queryByRole("list", { name: /recent events list/i });
            const items = list ? within(list).getAllByRole("listitem") : [];
            cleanup();
            return items.length === 20;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * When events array has ≤ 20 entries, all entries are rendered.
     */
    it("renders all entries when events.length ≤ 20", () => {
      // Feature: admin-console, Property 20: Recommended-plan and recent-events conditional rendering
      fc.assert(
        fc.property(
          fc.array(recentEventArb, { minLength: 1, maxLength: 20 }),
          (events) => {
            cleanup();
            renderRecentEventsPanel(events);

            const list = screen.queryByRole("list", { name: /recent events list/i });
            const items = list ? within(list).getAllByRole("listitem") : [];
            cleanup();
            return items.length === events.length;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Part C: Boundary examples ─────────────────────────────────────────────

  describe("Part C: Boundary examples", () => {
    it("recommended-plan card renders when label is exactly 1 character", () => {
      cleanup();
      const data: OverviewData = {
        total_accounts: 0,
        active_users: 0,
        banned_users: 0,
        online_users: 0,
        total_plans: 4,
        active_subscriptions: 0,
        recommended_plan: { code: "free" as never, label: "X" },
      };
      renderOverviewCards(data);
      expect(screen.queryByText("Recommended Plan")).not.toBeNull();
      cleanup();
    });

    it("recommended-plan card renders when label is exactly 80 characters", () => {
      cleanup();
      const label = "a".repeat(80);
      const data: OverviewData = {
        total_accounts: 0,
        active_users: 0,
        banned_users: 0,
        online_users: 0,
        total_plans: 4,
        active_subscriptions: 0,
        recommended_plan: { code: "basic" as never, label },
      };
      renderOverviewCards(data);
      expect(screen.queryByText("Recommended Plan")).not.toBeNull();
      cleanup();
    });

    it("recommended-plan card does NOT render when label is exactly 81 characters", () => {
      cleanup();
      const label = "a".repeat(81);
      const data: OverviewData = {
        total_accounts: 0,
        active_users: 0,
        banned_users: 0,
        online_users: 0,
        total_plans: 4,
        active_subscriptions: 0,
        recommended_plan: { code: "basic" as never, label },
      };
      renderOverviewCards(data);
      expect(screen.queryByText("Recommended Plan")).toBeNull();
      cleanup();
    });

    it("recent events panel renders exactly 20 entries when given 21 events", () => {
      cleanup();
      const events = Array.from({ length: 21 }, (_, i) => ({
        at: new Date(2024, 0, i + 1).toISOString(),
        type: `event-type-${i}`,
      }));
      renderRecentEventsPanel(events);
      const list = screen.getByRole("list", { name: /recent events list/i });
      expect(within(list).getAllByRole("listitem")).toHaveLength(20);
      cleanup();
    });

    it("event type longer than 64 chars is truncated to 64 chars in the rendered output", () => {
      cleanup();
      const longType = "x".repeat(100);
      const events = [{ at: new Date().toISOString(), type: longType }];
      renderRecentEventsPanel(events);
      const list = screen.getByRole("list", { name: /recent events list/i });
      const item = within(list).getAllByRole("listitem")[0];
      // The rendered text should contain the first 64 chars but not the full 100
      expect(item.textContent).toContain("x".repeat(64));
      expect(item.textContent).not.toContain("x".repeat(65));
      cleanup();
    });

    it("event type of exactly 64 chars is rendered without truncation", () => {
      cleanup();
      const type64 = "y".repeat(64);
      const events = [{ at: new Date().toISOString(), type: type64 }];
      renderRecentEventsPanel(events);
      const list = screen.getByRole("list", { name: /recent events list/i });
      const item = within(list).getAllByRole("listitem")[0];
      expect(item.textContent).toContain(type64);
      cleanup();
    });

    it("ISO 8601 timestamp is rendered verbatim in the event row", () => {
      cleanup();
      const isoTimestamp = "2024-06-15T10:30:00.000Z";
      const events = [{ at: isoTimestamp, type: "user.login" }];
      renderRecentEventsPanel(events);
      const list = screen.getByRole("list", { name: /recent events list/i });
      const item = within(list).getAllByRole("listitem")[0];
      expect(item.textContent).toContain(isoTimestamp);
      cleanup();
    });

    it("empty events array renders panel with no list items", () => {
      cleanup();
      renderRecentEventsPanel([]);
      // Panel renders but with empty state message, no list items
      const list = screen.queryByRole("list", { name: /recent events list/i });
      expect(list).toBeNull();
      cleanup();
    });
  });
});
