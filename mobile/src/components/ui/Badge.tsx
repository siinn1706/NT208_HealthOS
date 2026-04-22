import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme";

type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
}

export function Badge({ tone = "neutral", children }: BadgeProps) {
  const { colors, radius, typography, fontWeights, spacing, scheme } = useTheme();

  const tint = (light: string, dark: string) => (scheme === "dark" ? dark : light);

  const styleMap: Record<BadgeTone, { bg: string; text: string }> = {
    neutral: { bg: colors.surfaceMuted, text: colors.textMuted },
    brand: { bg: colors.accentSoft, text: colors.brand },
    success: {
      bg: tint("rgba(5, 150, 105, 0.14)", "rgba(52, 211, 153, 0.16)"),
      text: colors.success,
    },
    warning: {
      bg: tint("rgba(217, 119, 6, 0.14)", "rgba(251, 191, 36, 0.18)"),
      text: colors.warning,
    },
    danger: {
      bg: tint("rgba(229, 77, 77, 0.12)", "rgba(248, 113, 113, 0.16)"),
      text: colors.danger,
    },
    info: {
      bg: tint("rgba(2, 132, 199, 0.12)", "rgba(56, 189, 248, 0.16)"),
      text: colors.info,
    },
  };
  const s = styleMap[tone];
  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: s.bg,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.sm,
          paddingVertical: 3,
        },
      ]}
    >
      <Text
        style={{
          color: s.text,
          fontWeight: fontWeights.semibold,
          fontSize: typography.xs.fontSize,
          lineHeight: typography.xs.lineHeight,
          fontFamily: typography.xs.fontFamily,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
  },
});
