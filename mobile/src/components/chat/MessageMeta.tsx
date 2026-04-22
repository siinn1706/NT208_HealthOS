import React from "react";
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";

export interface MessageMetaProps {
  edited: boolean;
  showTimestamp: boolean;
  timeLabel: string;
  editedLabel: string;
  isMine: boolean;
  editedColor: string;
  mutedColor: string;
  fontSize: number;
  lineHeight: number;
  pending?: boolean;
  failed?: boolean;
  pendingLabel?: string;
  failedLabel?: string;
  rowStyle?: StyleProp<ViewStyle>;
  editedStyle?: StyleProp<TextStyle>;
  timeStyle?: StyleProp<TextStyle>;
  statusStyle?: StyleProp<TextStyle>;
}

export function MessageMeta({
  edited,
  showTimestamp,
  timeLabel,
  editedLabel,
  isMine,
  editedColor,
  mutedColor,
  fontSize,
  lineHeight,
  pending,
  failed,
  pendingLabel,
  failedLabel,
  rowStyle,
  editedStyle,
  timeStyle,
  statusStyle,
}: MessageMetaProps) {
  const { fontWeights } = useTheme();
  const showStatus = !!(pending && pendingLabel) || !!(failed && failedLabel);
  if (!edited && !showTimestamp && !showStatus) return null;
  const tc = isMine ? editedColor : mutedColor;
  return (
    <View style={rowStyle}>
      {failed && failedLabel ? (
        <Text
          style={[{ color: editedColor, fontSize, lineHeight, fontWeight: fontWeights.semibold }, statusStyle]}
        >
          {failedLabel}
        </Text>
      ) : null}
      {pending && pendingLabel && !failed ? (
        <Text style={[{ color: tc, fontSize, lineHeight }, statusStyle]}>{pendingLabel}</Text>
      ) : null}
      {edited ? (
        <Text style={[{ color: editedColor, fontSize, lineHeight }, editedStyle]}>{editedLabel}</Text>
      ) : null}
      {showTimestamp ? (
        <Text style={[{ color: tc, fontSize, lineHeight }, timeStyle]}>{timeLabel}</Text>
      ) : null}
    </View>
  );
}
