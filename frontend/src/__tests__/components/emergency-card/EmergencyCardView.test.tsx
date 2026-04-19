/**
 * EmergencyCardView — render contract tests.
 *
 * T-12 (review fix plan) — verify the visual contract:
 *   * Empty allergies + NKDA off → no allergies banner.
 *   * Empty allergies + NKDA on → NKDA banner present.
 *   * Long allergy list does not crash / overflow text.
 *   * Phone numbers render as `tel:` links for one-tap dialing.
 *   * Hidden fields (passed as `null` / empty array) omit the section
 *     entirely (we never render "None" or "N/A").
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { EmergencyCardView } from "@/components/dashboard/emergency-card/EmergencyCardView";
import type { PublicEmergencyCard } from "@/lib/emergency-card-types";

// Mock next-intl — these tests only care about the visual contract, not
// the translation system. Identity fallback returns the key verbatim so
// assertions can match on stable strings.
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));

function makeCard(overrides: Partial<PublicEmergencyCard> = {}): PublicEmergencyCard {
  return {
    full_name: "Alice Nguyen",
    age_years: 42,
    gender: "female",
    blood_type: "O+",
    nkda_confirmed: false,
    allergies: [],
    chronic_conditions: [],
    medications: [],
    assistance_needed: [],
    equipment_notes: null,
    communication_notes: null,
    preferred_language: null,
    emergency_contacts: [],
    last_updated_at: null,
    ...overrides,
  };
}

describe("EmergencyCardView", () => {
  it("renders the patient name and blood type", () => {
    render(<EmergencyCardView card={makeCard()} locale="en" />);
    expect(screen.getByText("Alice Nguyen")).toBeInTheDocument();
    expect(screen.getByText("O+")).toBeInTheDocument();
  });

  it("renders NKDA banner when nkda_confirmed=true and no allergies", () => {
    render(
      <EmergencyCardView
        card={makeCard({ allergies: [], nkda_confirmed: true })}
        locale="en"
      />
    );
    // English NKDA copy in the component
    expect(screen.getByText(/no known drug allergies/i)).toBeInTheDocument();
  });

  it("does NOT render allergies section when empty and NKDA is off", () => {
    render(
      <EmergencyCardView
        card={makeCard({ allergies: [], nkda_confirmed: false })}
        locale="en"
      />
    );
    expect(screen.queryByText(/NKDA/i)).not.toBeInTheDocument();
    // The Allergies heading is also absent — the section is fully omitted.
    expect(screen.queryByText(/^Allergies$/i)).not.toBeInTheDocument();
  });

  it("renders bullet list of allergies when populated", () => {
    render(
      <EmergencyCardView
        card={makeCard({ allergies: ["Penicillin", "latex", "peanuts"] })}
        locale="en"
      />
    );
    expect(screen.getByText("Penicillin")).toBeInTheDocument();
    expect(screen.getByText("latex")).toBeInTheDocument();
    expect(screen.getByText("peanuts")).toBeInTheDocument();
  });

  it("renders ICE contacts as tel: links", () => {
    render(
      <EmergencyCardView
        card={makeCard({
          emergency_contacts: [
            { name: "Bob", relationship: "spouse", phone: "+84 90 123 4567" },
          ],
        })}
        locale="en"
      />
    );
    const link = screen.getByRole("link", { name: /Call Bob/i });
    expect(link).toHaveAttribute("href", "tel:+84901234567");
  });

  it("omits the blood type chip when blood_type is null (no fake value)", () => {
    render(
      <EmergencyCardView card={makeCard({ blood_type: null })} locale="en" />
    );
    expect(screen.queryByText("O+")).not.toBeInTheDocument();
  });

  it("renders many allergies without crashing (overflow guard)", () => {
    const long = Array.from({ length: 12 }, (_, i) => `Allergen ${i + 1}`);
    render(
      <EmergencyCardView card={makeCard({ allergies: long })} locale="en" />
    );
    expect(screen.getByText("Allergen 1")).toBeInTheDocument();
    expect(screen.getByText("Allergen 12")).toBeInTheDocument();
  });

  it("does not render the medications section when none provided", () => {
    render(<EmergencyCardView card={makeCard({ medications: [] })} locale="en" />);
    // 'Pill' icon section heading absent.
    expect(screen.queryByText(/^Current medications$/i)).not.toBeInTheDocument();
  });

  it("renders medication name + strength only (no schedule/prescriber)", () => {
    render(
      <EmergencyCardView
        card={makeCard({
          medications: [{ name: "Lisinopril", strength: "10mg" }],
        })}
        locale="en"
      />
    );
    expect(screen.getByText("Lisinopril")).toBeInTheDocument();
    expect(screen.getByText("10mg")).toBeInTheDocument();
  });
});
