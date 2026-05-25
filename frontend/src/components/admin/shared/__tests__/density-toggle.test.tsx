// density-toggle.test.tsx — unit tests for DensityToggle component

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DensityToggle } from "../density-toggle";

describe("DensityToggle", () => {
  it("renders both density options", () => {
    render(<DensityToggle value="compact" onChange={vi.fn()} />);
    expect(screen.getByText("Compact")).toBeTruthy();
    expect(screen.getByText("Comfortable")).toBeTruthy();
  });

  it("marks active option with aria-pressed=true", () => {
    render(<DensityToggle value="comfortable" onChange={vi.fn()} />);
    const compact = screen.getByText("Compact").closest("button");
    const comfortable = screen.getByText("Comfortable").closest("button");
    expect(compact?.getAttribute("aria-pressed")).toBe("false");
    expect(comfortable?.getAttribute("aria-pressed")).toBe("true");
  });

  it("calls onChange with the clicked density value", () => {
    const onChange = vi.fn();
    render(<DensityToggle value="compact" onChange={onChange} />);
    fireEvent.click(screen.getByText("Comfortable"));
    expect(onChange).toHaveBeenCalledWith("comfortable");
  });

  it("has role=group with aria-label", () => {
    const { container } = render(<DensityToggle value="compact" onChange={vi.fn()} />);
    const group = container.querySelector('[role="group"]');
    expect(group?.getAttribute("aria-label")).toBe("Row density");
  });
});
