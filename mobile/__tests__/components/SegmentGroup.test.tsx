import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { SegmentGroup } from "@/components/ui/SegmentGroup";
import { ThemeProvider } from "@/theme";

function withTheme(node: React.ReactElement) {
  return <ThemeProvider initialMode="light">{node}</ThemeProvider>;
}

describe("SegmentGroup", () => {
  const options = [
    { value: "today", label: "Today" },
    { value: "all", label: "All" },
  ];

  it("renders one segment per entry and calls onChange when tapped", () => {
    const onChange = jest.fn();
    const { getByText } = render(
      withTheme(
        <SegmentGroup<string>
          value="today"
          onChange={onChange}
          options={options}
        />
      )
    );
    fireEvent.press(getByText("All"));
    expect(onChange).toHaveBeenCalledWith("all");
  });

  it("declares tab accessibility roles + selected state", () => {
    const { getAllByRole } = render(
      withTheme(
        <SegmentGroup<string>
          accessibilityLabel="View"
          value="today"
          onChange={() => undefined}
          options={options}
        />
      )
    );
    // Each segment is a tab. The tablist wrapper isn't focusable on its
    // own (RN accessibility tree only exposes leaf nodes by default).
    const tabs = getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    const selected = tabs.filter(
      (t) => t.props.accessibilityState?.selected === true
    );
    expect(selected).toHaveLength(1);
  });
});
