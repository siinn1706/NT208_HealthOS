import React from "react";
import { Pressable, Text, View } from "react-native";
import { Badge } from "@/components/ui/Badge";
import { useTheme } from "@/theme";

export interface InsightCardProps {
  primaryBadgeLabel: string;
  primaryBody: string | null;
  secondaryTitle?: string | null;
  secondaryBody?: string | null;
  ctaLabel: string;
  onCtaPress: () => void;
}

export function InsightCard({
  primaryBadgeLabel,
  primaryBody,
  secondaryTitle,
  secondaryBody,
  ctaLabel,
  onCtaPress,
}: InsightCardProps) {
  const { colors, fontWeights, typography, spacing, radius } = useTheme();

  const hasPrimary = Boolean(primaryBody?.trim());
  const hasSecondary = Boolean(secondaryTitle?.trim() || secondaryBody?.trim());

  if (!hasPrimary && !hasSecondary) return null;

  return (
    <View
      style={{
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: spacing.md,
        gap: spacing.md,
      }}
    >
      {hasPrimary ? (
        <View style={{ gap: spacing.sm }}>
          <Badge tone="brand">{primaryBadgeLabel}</Badge>
          <Text style={{ color: colors.text, fontSize: typography.base.fontSize }}>{primaryBody}</Text>
        </View>
      ) : null}

      {hasSecondary ? (
        <View
          style={{
            paddingTop: hasPrimary ? spacing.sm : 0,
            borderTopWidth: hasPrimary ? 1 : 0,
            borderTopColor: colors.border,
            gap: spacing.xs,
          }}
        >
          {secondaryTitle ? (
            <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>{secondaryTitle}</Text>
          ) : null}
          {secondaryBody ? <Text style={{ color: colors.textMuted }}>{secondaryBody}</Text> : null}
        </View>
      ) : null}

      <Pressable onPress={onCtaPress} hitSlop={8}>
        <Text style={{ color: colors.brand, fontWeight: fontWeights.semibold, fontSize: typography.sm.fontSize }}>
          {ctaLabel}
        </Text>
      </Pressable>
    </View>
  );
}
