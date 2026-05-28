// user-detail-action-bar.test.tsx — unit tests for UserDetailActionBar

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserDetailActionBar } from "../user-detail-action-bar";

const BASE_PROPS = {
  userId: "u-123",
  displayName: "Alice",
  email: "alice@example.com",
  status: "active",
  isSelf: false,
  isBanning: false,
  isUnbanning: false,
  onBanClick: vi.fn(),
  onUnban: vi.fn(),
};

describe("UserDetailActionBar", () => {
  it("renders display name", () => {
    render(<UserDetailActionBar {...BASE_PROPS} />);
    expect(screen.getByText("Alice")).toBeTruthy();
  });

  it("shows Ban button for active, non-self user", () => {
    render(<UserDetailActionBar {...BASE_PROPS} />);
    expect(screen.getByRole("button", { name: /ban/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /unban/i })).toBeNull();
  });

  it("shows Unban button for banned user", () => {
    render(<UserDetailActionBar {...BASE_PROPS} status="banned" />);
    expect(screen.getByRole("button", { name: /unban/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^ban/i })).toBeNull();
  });

  it("ban button is disabled (not hidden) when user is self", () => {
    render(<UserDetailActionBar {...BASE_PROPS} isSelf />);
    const banBtn = screen.getByRole("button", { name: /ban/i });
    expect(banBtn).toBeTruthy();
    expect((banBtn as HTMLButtonElement).disabled).toBe(true);
  });
});
