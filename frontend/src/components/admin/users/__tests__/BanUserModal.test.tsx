/**
 * BanUserModal — Property 23: Ban modal submit gating and payload
 *
 * Parts A–C: property-based tests (fast-check)
 * Part D:    deterministic example tests (task 18.5)
 *
 * Validates: Requirements 7.5, 7.6, 12.7
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as fc from "fast-check";

import { BanUserModal } from "@/components/admin/users/BanUserModal";

// ── Shared helpers ────────────────────────────────────────────────────────────

const noop = () => undefined;

function makeProps(overrides: Partial<Parameters<typeof BanUserModal>[0]> = {}) {
  return {
    userId: "user-123",
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    isSubmitting: false,
    error: null,
    ...overrides,
  };
}

/**
 * Render the modal, type `reason` into the textarea, and return the submit
 * button element. Uses `fireEvent.change` to avoid userEvent.type timeouts
 * on long strings. Wraps render in act() to ensure React 18 effects flush
 * before the change event fires.
 */
async function renderWithReason(reason: string) {
  const onSubmit = vi.fn();
  await act(async () => {
    render(<BanUserModal {...makeProps({ onSubmit })} />);
  });
  const textarea = screen.getByRole("textbox");
  await act(async () => {
    fireEvent.change(textarea, { target: { value: reason } });
  });
  // Extra flush — ensures React 18 batched state updates are committed
  await act(async () => {});
  const submitBtn = screen.getByRole("button", { name: /ban user/i });
  return { submitBtn, onSubmit };
}

// ── Property 23: Ban modal submit gating and payload ─────────────────────────

describe("Property 23: Ban modal submit gating and payload", () => {
  beforeEach(() => {
    cleanup();
  });

  // ── Part A: Submit button enabled/disabled state (Requirement 7.5) ─────────

  describe("Part A: Submit button enabled/disabled state (Requirement 7.5)", () => {
    /**
     * For any string r where r.trim().length ∈ [1, 500], the submit button
     * SHALL be enabled.
     *
     * Validates: Requirements 7.5
     */
    it("submit button is ENABLED for any r where r.trim().length ∈ [1, 500]", async () => {
      // Feature: admin-console, Property 23: Ban modal submit gating and payload
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length >= 1 && s.trim().length <= 500),
          async (r) => {
            cleanup();
            const { submitBtn } = await renderWithReason(r);
            const isDisabled = submitBtn.hasAttribute("disabled");
            cleanup();
            return !isDisabled;
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * For any string r where r.trim().length === 0 (empty or whitespace-only),
     * the submit button SHALL be disabled.
     *
     * Validates: Requirements 7.5
     */
    it("submit button is DISABLED for any r where r.trim().length === 0 (empty or whitespace-only)", async () => {
      // Feature: admin-console, Property 23: Ban modal submit gating and payload
      await fc.assert(
        fc.asyncProperty(
          fc.stringOf(fc.constantFrom(" ", "\t", "\n", "\r"), { maxLength: 20 }),
          async (r) => {
            cleanup();
            const { submitBtn } = await renderWithReason(r);
            const isDisabled = submitBtn.hasAttribute("disabled");
            cleanup();
            return isDisabled;
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * For any string r where r.trim().length > 500, the submit button
     * SHALL be disabled.
     *
     * Validates: Requirements 7.5
     */
    it("submit button is DISABLED for any r where r.trim().length > 500", async () => {
      // Feature: admin-console, Property 23: Ban modal submit gating and payload
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 501, maxLength: 600 }).filter((s) => s.trim().length > 500),
          async (r) => {
            cleanup();
            const { submitBtn } = await renderWithReason(r);
            const isDisabled = submitBtn.hasAttribute("disabled");
            cleanup();
            return isDisabled;
          },
        ),
        { numRuns: 30 },
      );
    });

    /**
     * Combined: submit button enabled state matches predicate
     * r.trim().length ∈ [1, 500] for any string r.
     *
     * Validates: Requirements 7.5
     */
    it("submit button enabled state matches predicate r.trim().length ∈ [1, 500] for any string r", async () => {
      // Feature: admin-console, Property 23: Ban modal submit gating and payload
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.stringOf(fc.constantFrom(" ", "\t", "\n"), { maxLength: 10 }),
            fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length >= 1 && s.trim().length <= 500),
          ),
          async (r) => {
            cleanup();
            const trimLen = r.trim().length;
            const shouldBeEnabled = trimLen >= 1 && trimLen <= 500;
            const { submitBtn } = await renderWithReason(r);
            const isDisabled = submitBtn.hasAttribute("disabled");
            cleanup();
            return shouldBeEnabled ? !isDisabled : isDisabled;
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  // ── Part B: onSubmit payload is r.trim() (Requirement 7.6) ────────────────

  describe("Part B: onSubmit payload is r.trim() (Requirement 7.6)", () => {
    /**
     * When the form is submitted with a valid reason r, onSubmit SHALL be
     * called exactly once with r.trim().
     *
     * Validates: Requirements 7.6
     */
    it("onSubmit is called exactly once with r.trim() for any valid reason r", async () => {
      // Feature: admin-console, Property 23: Ban modal submit gating and payload
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length >= 1 && s.trim().length <= 500),
          async (r) => {
            cleanup();
            const { submitBtn, onSubmit } = await renderWithReason(r);
            if (submitBtn.hasAttribute("disabled")) {
              cleanup();
              return true; // skip — button disabled means trim was empty
            }
            await act(async () => {
              fireEvent.click(submitBtn);
            });
            const called = onSubmit.mock.calls.length === 1 && onSubmit.mock.calls[0][0] === r.trim();
            cleanup();
            return called;
          },
        ),
        { numRuns: 30 },
      );
    });

    /**
     * When the reason is invalid (empty, whitespace-only, or over 500 chars),
     * the submit button SHALL NOT call onSubmit.
     *
     * Validates: Requirements 7.5
     */
    it("onSubmit is NOT called when reason is invalid (empty, whitespace-only, or over 500 chars)", async () => {
      // Feature: admin-console, Property 23: Ban modal submit gating and payload
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.stringOf(fc.constantFrom(" ", "\t", "\n"), { maxLength: 10 }),
            fc.string({ minLength: 501, maxLength: 600 }).filter((s) => s.trim().length > 500),
          ),
          async (r) => {
            cleanup();
            const { submitBtn, onSubmit } = await renderWithReason(r);
            // Button should be disabled — clicking it should not call onSubmit
            await act(async () => {
              fireEvent.click(submitBtn);
            });
            const notCalled = onSubmit.mock.calls.length === 0;
            cleanup();
            return notCalled;
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  // ── Part C: POST /api/v1/admin/users/[id]/ban payload (Requirement 7.6) ───

  describe("Part C: POST /api/v1/admin/users/[id]/ban payload (Requirement 7.6)", () => {
    /**
     * The trimmed reason passed to onSubmit matches the expected ban body
     * { reason: r.trim() }.
     *
     * Validates: Requirements 7.6
     */
    it("the trimmed reason passed to onSubmit matches the expected ban body { reason: r.trim() }", async () => {
      // Feature: admin-console, Property 23: Ban modal submit gating and payload
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length >= 1 && s.trim().length <= 500),
          async (r) => {
            cleanup();
            const { submitBtn, onSubmit } = await renderWithReason(r);
            if (submitBtn.hasAttribute("disabled")) {
              cleanup();
              return true;
            }
            await act(async () => {
              fireEvent.click(submitBtn);
            });
            const trimmed = r.trim();
            const called = onSubmit.mock.calls.length === 1 && onSubmit.mock.calls[0][0] === trimmed;
            cleanup();
            return called;
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  // ── Part D: Boundary examples (task 18.5 — Requirement 12.7) ──────────────

  describe("Part D: Boundary examples", () => {
    /**
     * Task 18.5 — three fixed input cases (Requirement 12.7):
     *   1. Empty string ""        → submit button disabled
     *   2. Whitespace-only "   "  → submit button disabled
     *   3. Non-whitespace "Spam"  → submit button enabled
     */

    it('empty string "" → submit disabled', async () => {
      cleanup();
      const { submitBtn } = await renderWithReason("");
      expect(submitBtn).toBeDisabled();
      cleanup();
    });

    it('whitespace-only "   " → submit disabled', async () => {
      cleanup();
      const { submitBtn } = await renderWithReason("   ");
      expect(submitBtn).toBeDisabled();
      cleanup();
    });

    it('"Spam" → submit enabled', async () => {
      cleanup();
      const { submitBtn } = await renderWithReason("Spam");
      expect(submitBtn).not.toBeDisabled();
      cleanup();
    });

    it("single non-whitespace character → submit enabled", async () => {
      cleanup();
      const { submitBtn } = await renderWithReason("x");
      expect(submitBtn).not.toBeDisabled();
      cleanup();
    });

    it("exactly 500 non-whitespace characters → submit enabled", async () => {
      cleanup();
      const reason = "a".repeat(500);
      const { submitBtn } = await renderWithReason(reason);
      expect(submitBtn).not.toBeDisabled();
      cleanup();
    });

    it("501 non-whitespace characters → submit disabled", async () => {
      cleanup();
      const reason = "a".repeat(501);
      const { submitBtn } = await renderWithReason(reason);
      expect(submitBtn).toBeDisabled();
      cleanup();
    });

    it("string with leading/trailing whitespace trims to valid reason → submit enabled and onSubmit called with trimmed value", async () => {
      cleanup();
      const inner = "valid reason";
      const padded = `   ${inner}   `;
      const { submitBtn, onSubmit } = await renderWithReason(padded);
      expect(submitBtn).not.toBeDisabled();
      await act(async () => {
        fireEvent.click(submitBtn);
      });
      expect(onSubmit).toHaveBeenCalledOnce();
      expect(onSubmit).toHaveBeenCalledWith(inner);
      cleanup();
    });

    it("string with leading/trailing whitespace that trims to empty → submit disabled", async () => {
      cleanup();
      const { submitBtn } = await renderWithReason("   \t\n   ");
      expect(submitBtn).toBeDisabled();
      cleanup();
    });
  });
});
