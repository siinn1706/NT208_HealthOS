// AdminErrorState.test.tsx — unit tests for AdminErrorState component

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminErrorState } from "../AdminErrorState";

describe("AdminErrorState", () => {
  it("renders reason text", () => {
    render(<AdminErrorState reason="Network failure" onRetry={vi.fn()} retriesLeft={3} />);
    expect(screen.getByText("Network failure")).toBeTruthy();
  });

  it("renders retry button when retriesLeft > 0", () => {
    render(<AdminErrorState reason="Oops" onRetry={vi.fn()} retriesLeft={2} />);
    expect(screen.getByRole("button", { name: /retry/i })).toBeTruthy();
    expect(screen.queryByText(/reload the page/i)).toBeNull();
  });

  it("shows retries-left count when retriesLeft < 3", () => {
    render(<AdminErrorState reason="Oops" onRetry={vi.fn()} retriesLeft={1} />);
    expect(screen.getByText("(1 left)")).toBeTruthy();
  });

  it("calls onRetry when retry button clicked", () => {
    const onRetry = vi.fn();
    render(<AdminErrorState reason="Oops" onRetry={onRetry} retriesLeft={2} />);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows reload message and no retry button when retriesLeft <= 0", () => {
    render(<AdminErrorState reason="Oops" onRetry={vi.fn()} retriesLeft={0} />);
    // i18n: admin.errors.noRetries → "Maximum retries reached."
    expect(screen.getByText(/maximum retries reached/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });

  it("has role=alert", () => {
    const { container } = render(<AdminErrorState reason="Error" onRetry={vi.fn()} retriesLeft={3} />);
    expect(container.querySelector('[role="alert"]')).toBeTruthy();
  });

  it("inline variant renders without page icon (no rounded-full icon wrapper)", () => {
    const { container } = render(
      <AdminErrorState reason="Inline error" onRetry={vi.fn()} retriesLeft={1} variant="inline" />,
    );
    // The page icon has a rounded-full wrapper; inline variant omits it
    expect(container.querySelector(".rounded-full")).toBeNull();
  });
});
