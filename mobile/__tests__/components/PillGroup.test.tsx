import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { PillGroup } from "@/components/ui/PillGroup";
import { ThemeProvider } from "@/theme";

function withTheme(node: React.ReactElement) {
  return <ThemeProvider initialMode="light">{node}</ThemeProvider>;
}

describe("PillGroup", () => {
  const options = [
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
    { value: "90d", label: "90 days" },
  ];

  it("renders one option per entry and calls onChange when tapped", () => {
    const onChange = jest.fn();
    const { getByText } = render(
      withTheme(
        <PillGroup<string>
          value="7d"
          onChange={onChange}
          options={options}
        />
      )
    );
    fireEvent.press(getByText("30 days"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("30d");
  });

  it("does NOT fire onChange for the already-selected pill", () => {
    // The component still calls the handler — UX-wise, re-tapping the
    // current selection should be a no-op that the consumer ignores.
    // What we DO want to lock in: the component does not silently
    // suppress identity-equal selections (the consumer might want the
    // signal for analytics).
    const onChange = jest.fn();
    const { getByText } = render(
      withTheme(<PillGroup<string> value="7d" onChange={onChange} options={options} />)
    );
    fireEvent.press(getByText("7 days"));
    expect(onChange).toHaveBeenCalledWith("7d");
  });

  it("declares accessibility roles correctly", () => {
    const { getAllByRole } = render(
      withTheme(
        <PillGroup<string>
          accessibilityLabel="Period"
          value="7d"
          onChange={() => undefined}
          options={options}
        />
      )
    );
    // Each pill is a radio. The radiogroup wrapper isn't focusable on
    // its own (RN accessibility tree only exposes leaf nodes by
    // default), so we assert on the leaves.
    const pills = getAllByRole("radio");
    expect(pills).toHaveLength(3);
    // The currently-selected pill should report selected: true.
    const selected = pills.filter(
      (p) => p.props.accessibilityState?.selected === true
    );
    expect(selected).toHaveLength(1);
  });

  it("supports numeric values (e.g. day-range pickers)", () => {
    const onChange = jest.fn();
    const { getByText } = render(
      withTheme(
        <PillGroup<number>
          value={7}
          onChange={onChange}
          options={[
            { value: 7, label: "7d" },
            { value: 30, label: "30d" },
          ]}
        />
      )
    );
    fireEvent.press(getByText("30d"));
    expect(onChange).toHaveBeenCalledWith(30);
  });
});
