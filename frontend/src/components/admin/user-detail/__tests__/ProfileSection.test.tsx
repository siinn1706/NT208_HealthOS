// ProfileSection.test.tsx — unit + property-based tests for ProfileSection component
// Tests: Identity, Account, Timeline groups (subscription rendering moved to CurrentSubscriptionCard)

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { render, screen } from "@testing-library/react";
import { ProfileSection, type UserDetail } from "../ProfileSection";

// ── Arbitraries ──────────────────────────────────────────────────────────────

const isoDateArb = fc
  .date({ min: new Date("2000-01-01T00:00:00Z"), max: new Date("2099-12-31T23:59:59Z") })
  .map((d) => d.toISOString());

const userDetailArb: fc.Arbitrary<UserDetail> = fc.record({
  user_id: fc.string({ minLength: 1, maxLength: 64 }),
  display_name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  email: fc.emailAddress(),
  status: fc.constantFrom("active", "banned", "deleted"),
  role: fc.option(fc.string({ maxLength: 50 }), { nil: null }),
  roles: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
  permissions: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
  subscription: fc.constant(null),
  created_at: isoDateArb,
  last_seen_at: fc.option(isoDateArb, { nil: null }),
});

function isIso8601(value: string): boolean {
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
  return iso8601Regex.test(value) && !isNaN(Date.parse(value));
}

// ── Base fixture ──────────────────────────────────────────────────────────────

const BASE_USER: UserDetail = {
  user_id: "user-abc-123",
  display_name: "Alice Admin",
  email: "alice@example.com",
  status: "active",
  role: "admin",
  roles: ["admin"],
  permissions: ["admin.access"],
  subscription: null,
  created_at: "2024-03-15T10:30:00.000Z",
  last_seen_at: "2024-06-01T08:00:00.000Z",
};

// ── Identity group ────────────────────────────────────────────────────────────

describe("ProfileSection — Identity", () => {
  it("renders display name", () => {
    render(<ProfileSection user={BASE_USER} />);
    expect(screen.getByText("Alice Admin")).toBeInTheDocument();
  });

  it("renders email", () => {
    render(<ProfileSection user={BASE_USER} />);
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  it("renders user_id", () => {
    render(<ProfileSection user={BASE_USER} />);
    expect(screen.getByText("user-abc-123")).toBeInTheDocument();
  });

  it("renders italic (no name) span when display_name is null", () => {
    const { container } = render(<ProfileSection user={{ ...BASE_USER, display_name: null }} />);
    // i18n mock resolves admin.userDetail.profile.noName → "(no name)"
    expect(container.querySelector("span.italic")).toBeTruthy();
    expect(screen.getByText("(no name)")).toBeInTheDocument();
  });
});

// ── Account group ─────────────────────────────────────────────────────────────

describe("ProfileSection — Account", () => {
  it("renders status badge text", () => {
    render(<ProfileSection user={BASE_USER} />);
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("renders each role as a badge", () => {
    const user = { ...BASE_USER, roles: ["admin", "moderator"] };
    render(<ProfileSection user={user} />);
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("moderator")).toBeInTheDocument();
  });

  it("renders no-roles label when roles is empty", () => {
    render(<ProfileSection user={{ ...BASE_USER, roles: [] }} />);
    // i18n mock resolves admin.userDetail.profile.noRoles → "No roles"
    expect(screen.getByText("No roles")).toBeInTheDocument();
  });
});

// ── Timeline group ────────────────────────────────────────────────────────────

describe("ProfileSection — Timeline", () => {
  it("renders created_at inside a <time> element", () => {
    const { container } = render(<ProfileSection user={BASE_USER} />);
    const el = container.querySelector(`time[datetime="${BASE_USER.created_at}"]`);
    expect(el).toBeInTheDocument();
    expect(el?.textContent).toBe(BASE_USER.created_at);
  });

  it("renders last_seen_at inside a <time> element when present", () => {
    const { container } = render(<ProfileSection user={BASE_USER} />);
    const el = container.querySelector(`time[datetime="${BASE_USER.last_seen_at}"]`);
    expect(el).toBeInTheDocument();
  });

  it("renders em-dash when last_seen_at is null", () => {
    render(<ProfileSection user={{ ...BASE_USER, last_seen_at: null }} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

// ── Property: date values are ISO 8601 ───────────────────────────────────────

describe("ProfileSection — date values are ISO 8601", () => {
  it("all <time datetime> attributes are valid ISO 8601", () => {
    fc.assert(
      fc.property(userDetailArb, (user) => {
        const { container, unmount } = render(<ProfileSection user={user} />);
        const timeElements = container.querySelectorAll("time");
        let allValid = true;
        timeElements.forEach((el) => {
          const dt = el.getAttribute("datetime");
          if (dt && !isIso8601(dt)) allValid = false;
        });
        unmount();
        return allValid;
      }),
      { numRuns: 50 },
    );
  });
});
