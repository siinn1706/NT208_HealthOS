// column-visibility-menu.test.tsx — unit tests for ColumnVisibilityMenu
// Note: Radix DropdownMenu content renders in a portal and is not in the DOM
// when closed. Tests cover the static trigger surface only.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ColumnVisibilityMenu, type ColumnDef } from "../column-visibility-menu";

const COLS: ColumnDef[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "status", label: "Status", hideable: false },
];

describe("ColumnVisibilityMenu", () => {
  it("renders trigger button with accessible label", () => {
    render(<ColumnVisibilityMenu columns={COLS} visible={new Set(["name", "email"])} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /toggle column visibility/i })).toBeTruthy();
  });

  it("trigger shows 'Columns' label text", () => {
    render(<ColumnVisibilityMenu columns={COLS} visible={new Set(["name"])} onChange={vi.fn()} />);
    expect(screen.getByText("Columns")).toBeTruthy();
  });

  it("trigger is a dropdown menu trigger (aria-haspopup=menu)", () => {
    render(<ColumnVisibilityMenu columns={COLS} visible={new Set(["name"])} onChange={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /toggle column visibility/i });
    expect(btn.getAttribute("aria-haspopup")).toBe("menu");
  });
});
