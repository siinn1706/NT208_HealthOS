/**
 * EmergencyMintDialog — consent + low-completeness override tests (T-13).
 *
 *   * Mint button is disabled until the acknowledge checkbox is ticked.
 *   * Low-completeness override surfaces the missing critical fields list
 *     (M6 fix verification).
 *   * Acknowledge checkbox alone is not enough when low-completeness flag
 *     is on — the override checkbox is also required.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EmergencyMintDialog } from "@/components/dashboard/emergency-card/EmergencyMintDialog";

// Stable identity translator — production `useTranslations` returns a
// memoized function; emulating that here avoids tripping `useEffect`s
// with `t` in their deps and re-resetting state mid-test.
vi.mock("next-intl", () => {
  const stableT = (key: string, vars?: Record<string, unknown>) => {
    if (vars && Object.keys(vars).length > 0) {
      return `${key}:${JSON.stringify(vars)}`;
    }
    return key;
  };
  return {
    useLocale: () => "en",
    useTranslations: () => stableT,
  };
});

describe("EmergencyMintDialog", () => {
  it("renders the consent dialog with the Mint button initially disabled", () => {
    render(
      <EmergencyMintDialog
        open
        onOpenChange={() => undefined}
        completenessScore={100}
        missingCriticalFields={[]}
        onMinted={() => undefined}
      />
    );
    const mintBtn = screen.getByRole("button", { name: /mint/i });
    expect(mintBtn).toBeDisabled();
  });

  it("enables the Mint button after the acknowledge checkbox is ticked", async () => {
    const user = userEvent.setup();
    render(
      <EmergencyMintDialog
        open
        onOpenChange={() => undefined}
        completenessScore={100}
        missingCriticalFields={[]}
        onMinted={() => undefined}
      />
    );
    const ack = screen.getByRole("checkbox", { name: /acknowledge/i });
    await user.click(ack);
    const mintBtn = screen.getByRole("button", { name: /mint/i });
    expect(mintBtn).not.toBeDisabled();
  });

  it("shows the low-completeness override section when score is below threshold", () => {
    render(
      <EmergencyMintDialog
        open
        onOpenChange={() => undefined}
        completenessScore={20}
        missingCriticalFields={["blood_type", "emergency_contacts"]}
        onMinted={() => undefined}
      />
    );
    expect(
      screen.getByText((c) => c.includes("lowCompletenessTitle"))
    ).toBeInTheDocument();
  });

  it("M6 — surfaces the missing fields list inside the low-completeness warning", () => {
    render(
      <EmergencyMintDialog
        open
        onOpenChange={() => undefined}
        completenessScore={20}
        missingCriticalFields={["blood_type", "allergies"]}
        onMinted={() => undefined}
      />
    );
    // The mocked translator returns the key verbatim — the dialog maps the
    // BE field key through the i18n bridge before rendering.
    expect(screen.getByText("blood_type")).toBeInTheDocument();
    expect(screen.getByText("allergies")).toBeInTheDocument();
  });

  it("low-completeness keeps mint disabled even after acknowledge until override is checked", async () => {
    const user = userEvent.setup();
    render(
      <EmergencyMintDialog
        open
        onOpenChange={() => undefined}
        completenessScore={20}
        missingCriticalFields={["blood_type"]}
        onMinted={() => undefined}
      />
    );
    const ack = screen.getByRole("checkbox", { name: /acknowledge/i });
    await user.click(ack);
    const mintBtn = screen.getByRole("button", { name: /mint/i });
    expect(mintBtn).toBeDisabled();

    // Tick the low-completeness override → button enables.
    const lowAck = screen.getByRole("checkbox", { name: /lowCompletenessBody/i });
    await user.click(lowAck);
    expect(mintBtn).not.toBeDisabled();
  });
});
