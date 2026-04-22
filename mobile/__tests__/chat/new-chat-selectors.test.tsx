import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { ChatModeToggle } from "@/components/chat/ChatModeToggle";
import { SelectedUserChip } from "@/components/chat/SelectedUserChip";
import { UserSearchRow } from "@/components/chat/UserSearchRow";
import { ThemeProvider } from "@/theme";

function withTheme(node: React.ReactElement) {
  return <ThemeProvider initialMode="light">{node}</ThemeProvider>;
}

describe("New chat selectors", () => {
  it("ChatModeToggle calls onChange when switching mode", () => {
    const onChange = jest.fn();
    const { getByText } = render(
      withTheme(
        <ChatModeToggle
          options={[
            { value: false, label: "Direct" },
            { value: true, label: "Group" },
          ]}
          value={false}
          onChange={onChange}
          activeColor="#00f"
          inactiveSurface="#eee"
          textColor="#111"
          activeTextColor="#fff"
        />
      )
    );
    fireEvent.press(getByText("Group"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("SelectedUserChip uses remove accessibility label", () => {
    const onRemove = jest.fn();
    const { getByLabelText } = render(
      withTheme(
        <SelectedUserChip
          name="Alex"
          removeAccessibilityLabel="Remove Alex"
          onRemove={onRemove}
          brandColor="#00f"
          brandMuted="#eef"
          radius={8}
        />
      )
    );
    fireEvent.press(getByLabelText("Remove Alex"));
    expect(onRemove).toHaveBeenCalled();
  });

  it("UserSearchRow reflects selection for accessibility", () => {
    const { getByRole, rerender } = render(
      withTheme(
        <UserSearchRow
          displayName="Alex"
          email="a@x.com"
          selected={false}
          onPress={() => undefined}
          textColor="#111"
          mutedColor="#999"
          brandColor="#00f"
          borderColor="#ccc"
          selectedBackgroundColor="#eef"
        />
      )
    );
    expect(getByRole("checkbox").props.accessibilityState?.checked).toBe(false);
    rerender(
      withTheme(
        <UserSearchRow
          displayName="Alex"
          email="a@x.com"
          selected
          onPress={() => undefined}
          textColor="#111"
          mutedColor="#999"
          brandColor="#00f"
          borderColor="#ccc"
          selectedBackgroundColor="#eef"
        />
      )
    );
    expect(getByRole("checkbox").props.accessibilityState?.checked).toBe(true);
  });
});
