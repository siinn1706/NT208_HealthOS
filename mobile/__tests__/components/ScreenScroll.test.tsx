import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { render } from "@testing-library/react-native";
import { ScreenScroll } from "@/components/ScreenScroll";
import { ThemeProvider } from "@/theme";
import { Platform } from "react-native";
import { spacing, TAB_BAR_FRAME_HEIGHT } from "@/theme/tokens";

jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

function withTheme(node: React.ReactElement) {
  return <ThemeProvider initialMode="light">{node}</ThemeProvider>;
}

describe("ScreenScroll", () => {
  it("applies tab-bar clearance plus safe-area bottom to content padding", () => {
    const { UNSAFE_getByType } = render(
      withTheme(
        <ScreenScroll>
          <Text>Body</Text>
        </ScreenScroll>
      )
    );
    const scroll = UNSAFE_getByType(ScrollView);
    const merged = StyleSheet.flatten(scroll.props.contentContainerStyle);
    const frame =
      Platform.OS === "ios" ? TAB_BAR_FRAME_HEIGHT.ios : TAB_BAR_FRAME_HEIGHT.android;
    expect(merged.paddingBottom).toBe(frame + spacing.base + 20);
  });
});
