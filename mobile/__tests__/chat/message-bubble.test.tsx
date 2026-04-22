import React from "react";
import { Pressable } from "react-native";
import { render } from "@testing-library/react-native";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ThemeProvider } from "@/theme";

function withTheme(node: React.ReactElement) {
  return <ThemeProvider initialMode="light">{node}</ThemeProvider>;
}

describe("MessageBubble", () => {
  const baseMeta = {
    edited: false,
    showTimestamp: true,
    timeLabel: "now",
    editedLabel: "(e)",
    isMine: true,
    editedColor: "#fff",
    mutedColor: "#999",
    fontSize: 10,
    lineHeight: 12,
  };

  it("renders body text and wires longPress on the outer pressable", () => {
    const onLongPress = jest.fn();
    const { getByText, UNSAFE_getByType } = render(
      withTheme(
        <MessageBubble
          content="Hello"
          isMine
          isRecalled={false}
          recalledLabel="R"
          pending={false}
          failed={false}
          maxWidth="78%"
          alignSelf="flex-end"
          groupPosition="solo"
          verticalSectionGap={8}
          showSenderLabel={false}
          senderLabelColor="#999"
          senderLabelSize={10}
          bubbleStyle={{}}
          bodyColor="#000"
          meta={baseMeta}
          reactions={null}
          onLongPress={onLongPress}
        />
      )
    );
    expect(getByText("Hello")).toBeTruthy();
    UNSAFE_getByType(Pressable).props.onLongPress?.();
    expect(onLongPress).toHaveBeenCalled();
  });

  it("shows recalled placeholder instead of body", () => {
    const { getByText } = render(
      withTheme(
        <MessageBubble
          content="ignored"
          isMine
          isRecalled
          recalledLabel="Removed"
          pending={false}
          failed={false}
          maxWidth="78%"
          alignSelf="flex-end"
          groupPosition="solo"
          verticalSectionGap={8}
          showSenderLabel={false}
          senderLabelColor="#999"
          senderLabelSize={10}
          bubbleStyle={{}}
          bodyColor="#000"
          meta={{ ...baseMeta, showTimestamp: false }}
          reactions={null}
          onLongPress={jest.fn()}
        />
      )
    );
    expect(getByText("[Removed]")).toBeTruthy();
  });
});
