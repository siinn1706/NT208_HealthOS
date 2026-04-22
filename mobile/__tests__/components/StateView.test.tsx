import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";
import { StateView } from "@/components/states/StateView";
import { ThemeProvider } from "@/theme";

function withTheme(node: React.ReactElement) {
  return <ThemeProvider initialMode="light">{node}</ThemeProvider>;
}

describe("StateView", () => {
  it("renders route density with title and description", () => {
    const { getByText } = render(
      withTheme(
        <StateView density="route" title="Empty" description="Nothing here" />
      )
    );
    expect(getByText("Empty")).toBeTruthy();
    expect(getByText("Nothing here")).toBeTruthy();
  });

  it("renders visual slot before title", () => {
    const { getByText } = render(
      withTheme(
        <StateView visual={<Text>ICON</Text>} title="T" description="D" />
      )
    );
    expect(getByText("ICON")).toBeTruthy();
  });

  it("renders action slot", () => {
    const { getByText } = render(
      withTheme(<StateView title="E" action={<Text>ACT</Text>} />)
    );
    expect(getByText("ACT")).toBeTruthy();
  });
});
