import React from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/theme";

export interface KpiMiniCardProps {
  label: string;
  valueDisplay: string;
  unit?: string;
  targetLine?: string | null;
}

export function KpiMiniCard({ label, valueDisplay, unit, targetLine }: KpiMiniCardProps) {
  const { colors, fontWeights, typography, spacing, radius } = useTheme();

  return (
    <View
      style={{
        flexBasis: "47%",
        flexGrow: 1,
        backgroundColor: colors.surfaceMuted,
        padding: spacing.md,
        borderRadius: radius.md,
        gap: spacing.xs,
      }}
    >
      <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: fontWeights.bold, fontSize: typography["xl"].fontSize }}>
        {valueDisplay}
        {unit ? (
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.sm.fontSize,
              fontWeight: fontWeights.regular,
            }}
          >
            {" "}
            {unit}
          </Text>
        ) : null}
      </Text>
      {targetLine ? (
        <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>{targetLine}</Text>
      ) : null}
    </View>
  );
}
