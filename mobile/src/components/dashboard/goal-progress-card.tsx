import React from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/theme";

export interface GoalProgressRow {
  id: string;
  label: string;
  valueLine: string;
  progressLabel?: string | null;
}

export interface GoalProgressCardProps {
  rows: GoalProgressRow[];
}

export function GoalProgressCard({ rows }: GoalProgressCardProps) {
  const { colors, fontWeights, typography, spacing, radius } = useTheme();

  if (rows.length === 0) return null;

  return (
    <View style={{ gap: spacing.md }}>
      {rows.map((row) => (
        <View
          key={row.id}
          style={{
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: colors.surfaceMuted,
            gap: spacing.xs,
          }}
        >
          <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>{row.label}</Text>
          <Text style={{ color: colors.text, fontWeight: fontWeights.semibold, fontSize: typography.base.fontSize }}>
            {row.valueLine}
          </Text>
          {row.progressLabel ? (
            <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>{row.progressLabel}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
