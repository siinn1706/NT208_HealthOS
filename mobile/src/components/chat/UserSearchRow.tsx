import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "@/theme";

export interface UserSearchRowProps {
  displayName: string;
  email?: string | null;
  selected: boolean;
  /** When false, bottom divider is omitted (e.g. last row in a list). */
  showDivider?: boolean;
  onPress: () => void;
  textColor: string;
  mutedColor: string;
  brandColor: string;
  borderColor: string;
  /** Background when `selected` (e.g. brand-muted surface). */
  selectedBackgroundColor: string;
}

export function UserSearchRow({
  displayName,
  email,
  selected,
  showDivider = true,
  onPress,
  textColor,
  mutedColor,
  brandColor,
  borderColor,
  selectedBackgroundColor,
}: UserSearchRowProps) {
  const { fontWeights, typography, spacing, radius, colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={displayName}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
        borderBottomWidth: showDivider ? 1 : 0,
        borderBottomColor: borderColor,
        minHeight: 48,
        backgroundColor: selected ? selectedBackgroundColor : "transparent",
        borderRadius: radius.sm,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{ color: textColor, fontWeight: fontWeights.medium }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {displayName}
        </Text>
        {email ? (
          <Text style={{ color: mutedColor, fontSize: typography.xs.fontSize }}>{email}</Text>
        ) : null}
      </View>
      {selected ? (
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: radius.pill,
            backgroundColor: brandColor,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: colors.brandText, fontSize: typography.sm.fontSize, fontWeight: fontWeights.bold }}>
            ✓
          </Text>
        </View>
      ) : (
        <View style={{ width: 24, height: 24 }} />
      )}
    </Pressable>
  );
}
