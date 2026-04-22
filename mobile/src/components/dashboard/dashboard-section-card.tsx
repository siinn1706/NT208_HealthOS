import React from "react";
import { Pressable, Text, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { useTheme } from "@/theme";

export interface DashboardSectionCardProps {
  title: string;
  subtitle?: string;
  headerActionLabel?: string;
  onHeaderActionPress?: () => void;
  children: React.ReactNode;
}

export function DashboardSectionCard({
  title,
  subtitle,
  headerActionLabel,
  onHeaderActionPress,
  children,
}: DashboardSectionCardProps) {
  const { colors, fontWeights, typography, spacing } = useTheme();

  return (
    <Card>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: spacing.md,
          marginBottom: spacing.sm,
        }}
      >
        <View style={{ flex: 1, gap: subtitle ? spacing.xs : 0 }}>
          <Text
            style={{
              color: colors.text,
              fontWeight: fontWeights.semibold,
              fontSize: typography.lg.fontSize,
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ color: colors.textMuted, fontSize: typography.sm.fontSize }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {headerActionLabel && onHeaderActionPress ? (
          <Pressable onPress={onHeaderActionPress} hitSlop={8}>
            <Text
              style={{
                color: colors.brand,
                fontWeight: fontWeights.semibold,
                fontSize: typography.sm.fontSize,
              }}
            >
              {headerActionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </Card>
  );
}
