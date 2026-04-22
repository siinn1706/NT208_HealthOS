import React from "react";
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

export interface ConversationRoomHeaderProps {
  title: string;
  titleStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /** @default 2 */
  titleNumberOfLines?: number;
}

export function ConversationRoomHeader({
  title,
  titleStyle,
  containerStyle,
  titleNumberOfLines = 2,
}: ConversationRoomHeaderProps) {
  return (
    <View style={containerStyle} accessibilityRole="header">
      <Text style={titleStyle} numberOfLines={titleNumberOfLines} ellipsizeMode="tail">
        {title}
      </Text>
    </View>
  );
}
