import React from "react";
import { Pressable, Text } from "react-native";
import { useTheme } from "@/theme";

export interface SelectedUserChipProps {
  name: string;
  onRemove: () => void;
  /** Describes the remove action for screen readers (e.g. “Remove {{name}}”). */
  removeAccessibilityLabel: string;
  brandColor: string;
  brandMuted: string;
  radius: number;
  borderColor?: string;
}

export function SelectedUserChip({
  name,
  onRemove,
  removeAccessibilityLabel,
  brandColor,
  brandMuted,
  radius,
  borderColor,
}: SelectedUserChipProps) {
  const { fontWeights, typography } = useTheme();
  return (
    <Pressable
      onPress={onRemove}
      accessibilityRole="button"
      accessibilityLabel={removeAccessibilityLabel}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        minHeight: 40,
        borderRadius: radius,
        backgroundColor: brandMuted,
        borderWidth: borderColor ? 1 : 0,
        borderColor: borderColor ?? "transparent",
        maxWidth: "100%",
      }}
    >
      <Text
        style={{ color: brandColor, fontWeight: fontWeights.semibold, flexShrink: 1 }}
        numberOfLines={1}
      >
        {name}
      </Text>
      <Text style={{ color: brandColor, fontSize: typography.lg.fontSize, lineHeight: typography.lg.lineHeight }}>
        ×
      </Text>
    </Pressable>
  );
}
