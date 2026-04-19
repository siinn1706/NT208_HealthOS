/**
 * Cross-cutting accessibility tests for the components / patterns most
 * likely to regress:
 *
 *   1. PillGroup pills meet the WCAG 2.1 AA 44dp touch-target minimum.
 *   2. SegmentGroup segments meet the same.
 *   3. Each pill / segment exposes the correct selected state to
 *      assistive tech (would silently break on a refactor that
 *      forgets `accessibilityState.selected`).
 *
 * These tests deliberately probe the rendered StyleSheet via
 * `props.style` rather than snapshotting; we want a regression to
 * fire only when the *contract* breaks (touch target shrinks,
 * selected state stops being announced), not on cosmetic style edits.
 */
import React from "react";
import { render } from "@testing-library/react-native";

import { PillGroup } from "@/components/ui/PillGroup";
import { SegmentGroup } from "@/components/ui/SegmentGroup";
import { ThemeProvider } from "@/theme";

function withTheme(node: React.ReactElement) {
  return <ThemeProvider initialMode="light">{node}</ThemeProvider>;
}

function flattenStyle(s: unknown): Record<string, unknown> {
  if (Array.isArray(s)) {
    return Object.assign({}, ...s.map(flattenStyle));
  }
  if (s && typeof s === "object") return s as Record<string, unknown>;
  return {};
}

describe("touch targets (WCAG 2.1 AA / Material 48dp)", () => {
  it("PillGroup pills set minHeight >= 44", () => {
    const { getAllByRole } = render(
      withTheme(
        <PillGroup<string>
          value="a"
          onChange={() => undefined}
          options={[
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ]}
        />
      )
    );
    for (const pill of getAllByRole("radio")) {
      const style = flattenStyle(pill.props.style);
      expect(typeof style.minHeight === "number" && style.minHeight >= 44).toBe(
        true
      );
    }
  });

  it("SegmentGroup segments set minHeight >= 44", () => {
    const { getAllByRole } = render(
      withTheme(
        <SegmentGroup<string>
          value="today"
          onChange={() => undefined}
          options={[
            { value: "today", label: "Today" },
            { value: "all", label: "All" },
          ]}
        />
      )
    );
    for (const segment of getAllByRole("tab")) {
      const style = flattenStyle(segment.props.style);
      expect(typeof style.minHeight === "number" && style.minHeight >= 44).toBe(
        true
      );
    }
  });
});

describe("selected-state announcement", () => {
  it("PillGroup marks the active pill as selected and the rest as not selected", () => {
    const { getAllByRole } = render(
      withTheme(
        <PillGroup<string>
          value="b"
          onChange={() => undefined}
          options={[
            { value: "a", label: "A" },
            { value: "b", label: "B" },
            { value: "c", label: "C" },
          ]}
        />
      )
    );
    const pills = getAllByRole("radio");
    const states = pills.map((p) => p.props.accessibilityState?.selected);
    expect(states).toEqual([false, true, false]);
  });

  it("SegmentGroup marks the active segment as selected", () => {
    const { getAllByRole } = render(
      withTheme(
        <SegmentGroup<string>
          value="all"
          onChange={() => undefined}
          options={[
            { value: "today", label: "Today" },
            { value: "all", label: "All" },
          ]}
        />
      )
    );
    const tabs = getAllByRole("tab");
    expect(tabs.map((t) => t.props.accessibilityState?.selected)).toEqual([
      false,
      true,
    ]);
  });
});

describe("accessibility labels", () => {
  it("PillGroup falls back to the visible label when no accessibilityLabel is set", () => {
    const { getByLabelText } = render(
      withTheme(
        <PillGroup<string>
          value="a"
          onChange={() => undefined}
          options={[
            { value: "a", label: "Steps" },
            { value: "b", label: "Sleep" },
          ]}
        />
      )
    );
    expect(getByLabelText("Steps")).toBeTruthy();
    expect(getByLabelText("Sleep")).toBeTruthy();
  });

  it("PillGroup honors a custom accessibilityLabel for cases where the visible label is non-descriptive", () => {
    const { getByLabelText } = render(
      withTheme(
        <PillGroup<string>
          value="7d"
          onChange={() => undefined}
          options={[
            { value: "7d", label: "7d", accessibilityLabel: "7 days" },
            { value: "30d", label: "30d", accessibilityLabel: "30 days" },
          ]}
        />
      )
    );
    expect(getByLabelText("7 days")).toBeTruthy();
    expect(getByLabelText("30 days")).toBeTruthy();
  });
});
