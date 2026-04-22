import React from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/theme";

export interface HomeHeroProps {
  greetingLine: string;
  subtitle: string;
  statusChipLabel: string;
}

export function HomeHero({ greetingLine, subtitle, statusChipLabel }: HomeHeroProps) {
  const { colors, fontWeights, typography, spacing, radius } = useTheme();
  const title = typography["2xl"];

  return (
    <View style={{ marginBottom: spacing.md, gap: spacing.sm }}>
      <Text
        style={{
          color: colors.text,
          fontWeight: fontWeights.bold,
          fontSize: title.fontSize,
          lineHeight: title.lineHeight,
        }}
        accessibilityRole="header"
      >
        {greetingLine}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: typography.base.fontSize }}>{subtitle}</Text>
      <View
        style={{
          alignSelf: "flex-start",
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceMuted,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ color: colors.text, fontSize: typography.sm.fontSize, fontWeight: fontWeights.medium }}>
          {statusChipLabel}
        </Text>
      </View>
    </View>
  );
}
