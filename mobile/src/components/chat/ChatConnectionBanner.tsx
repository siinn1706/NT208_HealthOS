import React from "react";
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";

export interface ChatConnectionBannerProps {
  /** When false, banner shows offline copy regardless of websocket state. */
  isOnline: boolean;
  wsConnected: boolean;
  offlineLabel: string;
  liveLabel: string;
  reconnectingLabel: string;
  dotColor: string;
  mutedColor: string;
  fontSize: number;
  rowStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Renders live / reconnecting / offline. Offline takes priority over reconnecting.
 */
export function ChatConnectionBanner({
  isOnline,
  wsConnected,
  offlineLabel,
  liveLabel,
  reconnectingLabel,
  dotColor,
  mutedColor,
  fontSize,
  rowStyle,
  textStyle,
}: ChatConnectionBannerProps) {
  const { radius } = useTheme();
  const label = !isOnline ? offlineLabel : wsConnected ? liveLabel : reconnectingLabel;
  return (
    <View style={rowStyle}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: radius.pill,
          backgroundColor: dotColor,
        }}
      />
      <Text style={[{ color: mutedColor, fontSize, flexShrink: 1 }, textStyle]}>{label}</Text>
    </View>
  );
}
