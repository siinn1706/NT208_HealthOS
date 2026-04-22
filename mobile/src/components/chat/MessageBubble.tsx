import React from "react";
import {
  Pressable,
  Text,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/theme";
import type { GroupPosition } from "@/utils/chat-presentation";
import { MessageMeta } from "./MessageMeta";
import { MessageReactions } from "./MessageReactions";
import type { MessageMetaProps } from "./MessageMeta";
import type { MessageReactionsProps } from "./MessageReactions";

const groupMarginTop = (position: GroupPosition, baseGap: number): number => {
  if (position === "first" || position === "solo") return baseGap;
  return 2;
};

export interface MessageBubbleProps {
  content: string;
  isMine: boolean;
  isRecalled: boolean;
  recalledLabel: string;
  pending: boolean;
  failed: boolean;
  maxWidth: DimensionValue;
  alignSelf: "flex-end" | "flex-start";
  groupPosition: GroupPosition;
  verticalSectionGap: number;
  showSenderLabel: boolean;
  senderLabel?: string | null;
  senderLabelColor: string;
  senderLabelSize: number;
  bubbleStyle: StyleProp<ViewStyle>;
  bodyColor: string;
  meta: Pick<
    MessageMetaProps,
    | "edited"
    | "showTimestamp"
    | "timeLabel"
    | "editedLabel"
    | "isMine"
    | "editedColor"
    | "mutedColor"
    | "fontSize"
    | "lineHeight"
    | "pending"
    | "failed"
    | "pendingLabel"
    | "failedLabel"
  >;
  reactions: MessageReactionsProps | null;
  onLongPress: () => void;
}

export function MessageBubble({
  content,
  isMine,
  isRecalled,
  recalledLabel,
  pending,
  failed,
  maxWidth,
  alignSelf,
  groupPosition,
  verticalSectionGap,
  showSenderLabel,
  senderLabel,
  senderLabelColor,
  senderLabelSize,
  bubbleStyle,
  bodyColor,
  meta,
  reactions,
  onLongPress,
}: MessageBubbleProps) {
  const { fontWeights } = useTheme();
  const mt = groupMarginTop(groupPosition, verticalSectionGap);
  return (
    <Pressable
      onLongPress={onLongPress}
      style={{ alignSelf, maxWidth, marginTop: mt }}
      delayLongPress={350}
    >
      {showSenderLabel && senderLabel ? (
        <Text
          style={{
            color: senderLabelColor,
            fontSize: senderLabelSize,
            marginBottom: 4,
            fontWeight: fontWeights.semibold,
          }}
        >
          {senderLabel}
        </Text>
      ) : null}
      <View style={[bubbleStyle, { opacity: pending ? 0.6 : failed ? 0.4 : 1 }]}>
        <Text style={{ color: bodyColor, flexShrink: 1, alignSelf: "stretch" }}>
          {isRecalled ? `[${recalledLabel}]` : content}
        </Text>
        <MessageMeta
          {...meta}
          rowStyle={{
            flexDirection: "row",
            gap: 8,
            marginTop: 8,
            flexWrap: "wrap",
          }}
        />
        {reactions ? (
          <MessageReactions
            reactions={reactions.reactions}
            textColor={reactions.textColor}
            rowStyle={[
              { flexDirection: "row", gap: 4, marginTop: 4 },
              reactions.rowStyle,
            ]}
            chipStyle={reactions.chipStyle}
          />
        ) : null}
      </View>
    </Pressable>
  );
}
