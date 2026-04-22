import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";
import { Card } from "@/components/ui/Card";
import { ThemeProvider } from "@/theme";

function withTheme(node: React.ReactElement) {
  return <ThemeProvider initialMode="light">{node}</ThemeProvider>;
}

describe("Card", () => {
  it("renders children for default variant", () => {
    const { getByText } = render(
      withTheme(
        <Card>
          <Text>Inside</Text>
        </Card>
      )
    );
    expect(getByText("Inside")).toBeTruthy();
  });

  it("accepts muted variant", () => {
    const { getByText } = render(
      withTheme(
        <Card variant="muted">
          <Text>M</Text>
        </Card>
      )
    );
    expect(getByText("M")).toBeTruthy();
  });
});
