// admin-page-header.test.tsx — unit tests for AdminPageHeader

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminPageHeader } from "../admin-page-header";

describe("AdminPageHeader", () => {
  it("renders title as h1", () => {
    render(<AdminPageHeader title="Users" />);
    const h1 = screen.getByRole("heading", { level: 1, name: "Users" });
    expect(h1).toBeTruthy();
  });

  it("renders description when provided", () => {
    render(<AdminPageHeader title="Users" description="Manage accounts." />);
    expect(screen.getByText("Manage accounts.")).toBeTruthy();
  });

  it("does not render description element when omitted", () => {
    render(<AdminPageHeader title="Overview" />);
    expect(screen.queryByRole("paragraph")).toBeNull();
  });

  it("renders children in the actions slot", () => {
    render(
      <AdminPageHeader title="Subscriptions">
        <button type="button">Export</button>
      </AdminPageHeader>,
    );
    expect(screen.getByRole("button", { name: "Export" })).toBeTruthy();
  });
});
