// Sparkline.test.tsx — unit tests for Sparkline SVG component

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Sparkline } from "../Sparkline";

describe("Sparkline", () => {
  it("renders flat dashed line when data is null", () => {
    const { container } = render(<Sparkline data={null} />);
    expect(container.querySelector("line")).toBeTruthy();
    expect(container.querySelector("polyline")).toBeNull();
  });

  it("renders flat dashed line when data has fewer than 2 points", () => {
    const { container } = render(<Sparkline data={[42]} />);
    expect(container.querySelector("line")).toBeTruthy();
  });

  it("renders polyline when data has 2+ points", () => {
    const { container } = render(<Sparkline data={[1, 2, 3, 4, 5]} />);
    expect(container.querySelector("polyline")).toBeTruthy();
    expect(container.querySelector("line")).toBeNull();
  });

  it("is aria-hidden (purely decorative)", () => {
    const { container } = render(<Sparkline data={[10, 20]} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });
});
