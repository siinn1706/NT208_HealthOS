import React from "react";
import { render } from "@testing-library/react-native";
import { ConversationListItem } from "@/components/chat/ConversationListItem";
import { ThemeProvider } from "@/theme";

function withTheme(node: React.ReactElement) {
  return <ThemeProvider initialMode="light">{node}</ThemeProvider>;
}

describe("ConversationListItem", () => {
  it("renders title and caps unread badge at 99+", () => {
    const { getByText } = render(
      withTheme(
        <ConversationListItem
          title="Team chat"
          preview="Hi"
          timeLabel="2m ago"
          unreadCount={140}
          isPinned
          isMuted={false}
          pinnedLabel="Pinned"
          mutedLabel="Muted"
          onPress={() => undefined}
        />
      )
    );
    expect(getByText("Team chat")).toBeTruthy();
    expect(getByText("99+")).toBeTruthy();
  });
});
