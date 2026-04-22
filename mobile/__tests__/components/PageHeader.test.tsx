import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";
import { PageHeader } from "@/components/ui/PageHeader";
import { ThemeProvider } from "@/theme";

function withTheme(node: React.ReactElement) {
  return <ThemeProvider initialMode="light">{node}</ThemeProvider>;
}

describe("PageHeader", () => {
  it("renders title, subtitle, and action slot", () => {
    const { getByText } = render(
      withTheme(
        <PageHeader title="Title" subtitle="Sub" action={<Text>Act</Text>} />
      )
    );
    expect(getByText("Title")).toBeTruthy();
    expect(getByText("Sub")).toBeTruthy();
    expect(getByText("Act")).toBeTruthy();
  });
});
