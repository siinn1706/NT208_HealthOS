import React from "react";
import { Text, View } from "react-native";
import { Badge } from "@/components/ui/Badge";
import { useTheme } from "@/theme";

export interface ReminderPreviewItemProps {
  title: string;
  metaLine: string;
  typeLabel: string;
  /** When true, omits the bottom divider (e.g. last row in a list). */
  isLast?: boolean;
}

export function ReminderPreviewItem({ title, metaLine, typeLabel, isLast }: ReminderPreviewItemProps) {
  const { colors, fontWeights, typography, spacing } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.sm,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flex: 1, paddingRight: spacing.sm }}>
        <Text style={{ color: colors.text, fontWeight: fontWeights.medium }}>{title}</Text>
        <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>{metaLine}</Text>
      </View>
      <Badge tone="neutral">{typeLabel}</Badge>
    </View>
  );
}
