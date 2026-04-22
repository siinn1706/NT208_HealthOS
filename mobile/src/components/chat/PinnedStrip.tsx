import React from "react";
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

export interface PinnedStripProps {
  countLabel: string;
  preview: string;
  surfaceStyle?: StyleProp<ViewStyle>;
  countTextStyle?: StyleProp<TextStyle>;
  previewTextStyle?: StyleProp<TextStyle>;
}

export function PinnedStrip({
  countLabel,
  preview,
  surfaceStyle,
  countTextStyle,
  previewTextStyle,
}: PinnedStripProps) {
  return (
    <View style={[{ gap: 6 }, surfaceStyle]}>
      <Text style={countTextStyle} numberOfLines={1}>
        {countLabel}
      </Text>
      <Text style={previewTextStyle} numberOfLines={2}>
        {preview}
      </Text>
    </View>
  );
}
