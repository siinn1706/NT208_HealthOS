import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme";

type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
}

export function Badge({ tone = "neutral", children }: BadgeProps) {
  const { colors, radius, typography, fontWeights, spacing } = useTheme();
  const styleMap: Record<BadgeTone, { bg: string; text: string }> = {
    neutral: { bg: colors.surfaceMuted, text: colors.textMuted },
    brand: { bg: colors.brandMuted, text: colors.brand },
    success: { bg: colors.successText, text: colors.success },
    warning: { bg: colors.warningText, text: colors.warning },
    danger: { bg: colors.dangerText, text: colors.danger },
    info: { bg: colors.infoText, text: colors.info },
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
          paddingVertical: 2,
        },
      ]}
    >
      <Text
        style={{
          color: s.text,
          fontWeight: fontWeights.semibold,
          fontSize: typography.xs.fontSize,
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
