import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme";

export interface QuickActionTileProps {
  title: string;
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  testID?: string;
}

export function QuickActionTile({ title, iconName, onPress, testID }: QuickActionTileProps) {
  const { colors, fontWeights, typography, spacing, radius } = useTheme();

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => ({
        flexBasis: "47%",
        flexGrow: 1,
        minHeight: 88,
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceMuted,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View style={{ gap: spacing.sm }}>
        <Ionicons name={iconName} size={22} color={colors.brand} />
        <Text
          style={{
            color: colors.text,
            fontWeight: fontWeights.semibold,
            fontSize: typography.sm.fontSize,
          }}
          numberOfLines={2}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}
