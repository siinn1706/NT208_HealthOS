import React from "react";
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import type { ReactionDTO } from "@/api/endpoints/conversations";

export interface MessageReactionsProps {
  reactions: ReactionDTO[] | null | undefined;
  textColor: string;
  rowStyle?: StyleProp<ViewStyle>;
  chipStyle?: StyleProp<TextStyle>;
}

export function MessageReactions({ reactions, textColor, rowStyle, chipStyle }: MessageReactionsProps) {
  if (!reactions || reactions.length === 0) return null;
  const grouped = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <View style={rowStyle}>
      {Object.entries(grouped).map(([emoji, count]) => (
        <Text key={emoji} style={[{ color: textColor }, chipStyle]}>
          {emoji} {count}
        </Text>
      ))}
    </View>
  );
}
