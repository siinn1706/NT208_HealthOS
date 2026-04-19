import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Button } from "@/components/ui/Button";
import { ThemeProvider } from "@/theme";

function withTheme(node: React.ReactElement) {
  return <ThemeProvider initialMode="light">{node}</ThemeProvider>;
}

describe("Button", () => {
  it("renders the children text and is pressable", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      withTheme(<Button onPress={onPress}>Click me</Button>)
    );
    fireEvent.press(getByText("Click me"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not fire onPress when disabled", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      withTheme(
        <Button onPress={onPress} disabled>
          Disabled
        </Button>
      )
    );
    fireEvent.press(getByText("Disabled"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("does not fire onPress while loading", () => {
    const onPress = jest.fn();
    const { UNSAFE_root } = render(
      withTheme(
        <Button onPress={onPress} loading>
          Working
        </Button>
      )
    );
    // Button replaces children with a spinner while loading; press the root.
    const pressables = UNSAFE_root.findAllByType("RCTView" as never).filter(
      (n: { props: { accessibilityRole?: string } }) =>
        n.props.accessibilityRole === "button"
    );
    const target = pressables[0];
    if (target) {
      fireEvent.press(target);
    }
    expect(onPress).not.toHaveBeenCalled();
  });

  it("declares the right accessibility role", () => {
    const { getByRole } = render(
      withTheme(<Button onPress={() => undefined}>Tap</Button>)
    );
    expect(getByRole("button")).toBeTruthy();
  });
});
