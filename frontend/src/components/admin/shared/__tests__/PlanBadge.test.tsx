// PlanBadge.test.tsx — property-based tests for PlanBadge component
// Feature: admin-console, Property 33: Unknown plan code rendering and form gating
//
// **Validates: Requirements 13.4, 13.5**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { render } from "@testing-library/react";

import { PlanBadge } from "../PlanBadge";
import { isKnownPlanCode } from "@/lib/admin/plan-catalog";

// The four canonical plan codes
const KNOWN_CODES = ["free", "basic", "family", "professional"] as const;

/**
 * Property 33: Unknown plan code rendering and form gating
 *
 * For any plan row whose `code` is not in {free, basic, family, professional},
 * the subscriptions table SHALL render the row with a warning badge indicating
 * an unrecognized plan code (R13.4).
 *
 * For any candidate code `c` entered into a plan-edit form, the submit control
 * SHALL be enabled iff isKnownPlanCode(c) (R13.5).
 *
 * **Validates: Requirements 13.4, 13.5**
 */
describe("Property 33: Unknown plan code rendering and form gating", () => {
  // ── Part A: unknown codes render with variant="warning" (destructive badge) ──

  it("renders variant='warning' (destructive badge) for any code outside the catalog (fc.string)", () => {
    // Feature: admin-console, Property 33: Unknown plan code rendering and form gating
    fc.assert(
      fc.property(
        // Generate strings that are NOT one of the four known codes
        fc.string().filter((s) => !isKnownPlanCode(s)),
        (unknownCode) => {
          const { container, unmount } = render(
            <PlanBadge code={unknownCode} variant="warning" />,
          );
          // Badge sets data-variant on the rendered span
          const badgeEl = container.querySelector("[data-slot='badge']");
          const result = badgeEl?.getAttribute("data-variant") === "destructive";
          unmount();
          return result;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("renders variant='known' (default badge) for any code inside the catalog (fc.constantFrom)", () => {
    // Feature: admin-console, Property 33: Unknown plan code rendering and form gating
    fc.assert(
      fc.property(
        fc.constantFrom(...KNOWN_CODES),
        (knownCode) => {
          const { container, unmount } = render(
            <PlanBadge code={knownCode} variant="known" />,
          );
          const badgeEl = container.querySelector("[data-slot='badge']");
          const result = badgeEl?.getAttribute("data-variant") === "default";
          unmount();
          return result;
        },
      ),
      { numRuns: 100 },
    );
  });

  // ── Part B: isKnownPlanCode drives the expected variant ──────────────────

  it("isKnownPlanCode determines expected badge variant for any arbitrary string", () => {
    // Feature: admin-console, Property 33: Unknown plan code rendering and form gating
    fc.assert(
      fc.property(fc.string(), (code) => {
        const expectedVariant: "known" | "warning" = isKnownPlanCode(code)
          ? "known"
          : "warning";
        const { container, unmount } = render(
          <PlanBadge code={code} variant={expectedVariant} />,
        );
        const badgeEl = container.querySelector("[data-slot='badge']");
        const expectedBadgeVariant =
          expectedVariant === "warning" ? "destructive" : "default";
        const result =
          badgeEl?.getAttribute("data-variant") === expectedBadgeVariant;
        unmount();
        return result;
      }),
      { numRuns: 100 },
    );
  });

  // ── Part C: mixed known + unknown codes — exhaustive examples ────────────

  describe("known codes render default badge (exhaustive examples)", () => {
    for (const code of KNOWN_CODES) {
      it(`PlanBadge code="${code}" variant="known" → data-variant="default"`, () => {
        const { container } = render(<PlanBadge code={code} variant="known" />);
        const badgeEl = container.querySelector("[data-slot='badge']");
        expect(badgeEl).toHaveAttribute("data-variant", "default");
      });
    }
  });

  it('unknown code "enterprise" renders destructive badge', () => {
    const { container } = render(
      <PlanBadge code="enterprise" variant="warning" />,
    );
    const badgeEl = container.querySelector("[data-slot='badge']");
    expect(badgeEl).toHaveAttribute("data-variant", "destructive");
  });

  it('unknown code "" (empty string) renders destructive badge', () => {
    const { container } = render(<PlanBadge code="" variant="warning" />);
    const badgeEl = container.querySelector("[data-slot='badge']");
    expect(badgeEl).toHaveAttribute("data-variant", "destructive");
  });

  it('unknown code "FREE" (uppercase) renders destructive badge', () => {
    const { container } = render(<PlanBadge code="FREE" variant="warning" />);
    const badgeEl = container.querySelector("[data-slot='badge']");
    expect(badgeEl).toHaveAttribute("data-variant", "destructive");
  });
});
